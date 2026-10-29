import { describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioProcessamentoNfce } from "./RepositorioProcessamentoNfce";

const AGORA = new Date("2026-09-10T12:00:00.000Z");
const EMISSAO = new Date("2026-09-04T16:00:00.000Z");

type CampanhaFake = {
    id: number;
    ativa: boolean;
    edicao: number;
    dataInicio: Date;
    dataFim: Date;
    valorPorTicket: number;
};

/** Fronteira Prisma em memória: registra a ordem das operações e os argumentos. */
function prepararTx(opcoes: {
    campanha?: Partial<CampanhaFake> | null;
    residual?: { valorResidual: number; ticketsTotais: number };
    maiorNumero?: number | null;
    erroCriarNfce?: unknown;
} = {}) {
    const ordem: string[] = [];
    const campanha: CampanhaFake | null =
        opcoes.campanha === null
            ? null
            : {
                  id: 1,
                  ativa: true,
                  edicao: 1,
                  dataInicio: new Date("2026-09-01T03:00:00.000Z"),
                  dataFim: new Date("2026-10-01T02:59:59.999Z"),
                  valorPorTicket: 10,
                  ...opcoes.campanha,
              };
    const residual = opcoes.residual ?? { valorResidual: 0, ticketsTotais: 0 };

    const tx = {
        $executeRaw: vi.fn(async (sql: TemplateStringsArray) => {
            ordem.push(/FROM campanha\s/.test(sql.join("")) ? "lock-campanha" : "lock-residual");
        }),
        campanha: {
            findUnique: vi.fn(async () => {
                ordem.push("load-campanha");
                return campanha;
            }),
        },
        residualTicketCampanha: {
            createMany: vi.fn(async () => {
                ordem.push("ensure-residual");
                return { count: 1 };
            }),
            findUnique: vi.fn(async () => {
                ordem.push("load-residual");
                return { id: 7, ...residual };
            }),
            update: vi.fn(async (args: { data: { valorResidual: number; ticketsTotais: { increment: number } } }) => {
                ordem.push("update-residual");
                return {
                    id: 7,
                    valorResidual: args.data.valorResidual,
                    ticketsTotais: residual.ticketsTotais + args.data.ticketsTotais.increment,
                };
            }),
        },
        processamentoNfce: {
            create: vi.fn(async (args: { data: Record<string, unknown> }) => {
                ordem.push("create-nfce");
                if (opcoes.erroCriarNfce) {
                    throw opcoes.erroCriarNfce;
                }
                return { id: 11, ...args.data };
            }),
        },
        ticket: {
            aggregate: vi.fn(async () => {
                ordem.push("max-ticket");
                return { _max: { numero: opcoes.maiorNumero ?? null } };
            }),
            createMany: vi.fn(async (args: { data: unknown[] }) => {
                ordem.push("create-tickets");
                return { count: args.data.length };
            }),
        },
    };
    const repo = new RepositorioProcessamentoNfce({
        $transaction: async (fn: (cliente: typeof tx) => Promise<unknown>) => fn(tx),
    } as never);
    return { repo, tx, ordem };
}

function processar(repo: RepositorioProcessamentoNfce, valorNota: number, extra: Partial<{ dataEmissao: Date; agora: Date }> = {}) {
    return repo.processarComCredito({
        chaveAcesso: "35260838281946000146650010000042331599885707",
        campanhaId: 1,
        consumidorId: 9,
        lojistaId: 2,
        valorNota,
        dataEmissao: extra.dataEmissao ?? EMISSAO,
        agora: extra.agora ?? AGORA,
    });
}

describe("RepositorioProcessamentoNfce.processarComCredito", () => {
    it("trava a campanha antes do residual e soma tickets (R$669,86 / R$10 → 66 + R$9,86)", async () => {
        const { repo, tx, ordem } = prepararTx();

        const resultado = await processar(repo, 669.86);

        expect(resultado).toMatchObject({
            edicao: 1,
            ticketsGerados: 66,
            residualApos: 9.86,
            ticketsTotaisCampanha: 66,
            numerosTickets: { primeiro: 1, ultimo: 66 },
        });
        expect(ordem).toEqual([
            "lock-campanha",
            "load-campanha",
            "ensure-residual",
            "lock-residual",
            "load-residual",
            "create-nfce",
            "update-residual",
            "max-ticket",
            "create-tickets",
        ]);
        const tickets = tx.ticket.createMany.mock.calls[0]![0].data as { numero: number }[];
        expect(tickets).toHaveLength(66);
        expect(tickets[0]).toMatchObject({ numero: 1, edicao: 1, consumidorId: 9, processamentoNfceId: 11 });
        expect(tickets[65]!.numero).toBe(66);
    });

    it("usa a edição relida com a campanha travada em residual, nota, numeração e tickets", async () => {
        const { repo, tx } = prepararTx({ campanha: { edicao: 2 }, maiorNumero: null });

        const resultado = await processar(repo, 30);

        expect(resultado.edicao).toBe(2);
        expect(resultado.numerosTickets).toEqual({ primeiro: 1, ultimo: 3 });
        expect(tx.residualTicketCampanha.createMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: [expect.objectContaining({ edicao: 2 })] }),
        );
        expect(tx.residualTicketCampanha.findUnique).toHaveBeenCalledWith({
            where: { consumidorId_campanhaId_edicao: { consumidorId: 9, campanhaId: 1, edicao: 2 } },
        });
        expect(tx.processamentoNfce.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ edicao: 2 }),
        });
        expect(tx.ticket.aggregate).toHaveBeenCalledWith({
            where: { campanhaId: 1, edicao: 2 },
            _max: { numero: true },
        });
        const tickets = tx.ticket.createMany.mock.calls[0]![0].data as { edicao: number }[];
        expect(tickets.every((t) => t.edicao === 2)).toBe(true);
    });

    it("calcula com o valor por ticket da campanha travada (não com valor lido antes)", async () => {
        const { repo } = prepararTx({ campanha: { valorPorTicket: 20 } });

        const resultado = await processar(repo, 50);

        expect(resultado).toMatchObject({ ticketsGerados: 2, residualApos: 10 });
    });

    it("acumula residual anterior da mesma edição (R$5 + R$5 / R$10 → 1 ticket + 0)", async () => {
        const { repo } = prepararTx({ residual: { valorResidual: 5, ticketsTotais: 5 }, maiorNumero: 66 });

        const resultado = await processar(repo, 5);

        expect(resultado).toMatchObject({
            ticketsGerados: 1,
            residualApos: 0,
            ticketsTotaisCampanha: 6,
            numerosTickets: { primeiro: 67, ultimo: 67 },
        });
    });

    it("nota sem ticket registra o processamento mas não cria tickets", async () => {
        const { repo, tx } = prepararTx();

        const resultado = await processar(repo, 3);

        expect(resultado.numerosTickets).toBeNull();
        expect(tx.processamentoNfce.create).toHaveBeenCalled();
        expect(tx.ticket.aggregate).not.toHaveBeenCalled();
        expect(tx.ticket.createMany).not.toHaveBeenCalled();
    });

    it("campanha inativa (reler após lock) → 400 sem gravar nada", async () => {
        const { repo, tx } = prepararTx({ campanha: { ativa: false } });

        await expect(processar(repo, 50)).rejects.toMatchObject({
            statusCode: 400,
            detalhes: { codigo: "CAMPANHA_INATIVA" },
        });
        expect(tx.residualTicketCampanha.createMany).not.toHaveBeenCalled();
        expect(tx.processamentoNfce.create).not.toHaveBeenCalled();
    });

    it("fora do período vigente no momento do crédito → 400 CAMPANHA_NAO_VIGENTE", async () => {
        const { repo, tx } = prepararTx();

        await expect(
            processar(repo, 50, { agora: new Date("2026-10-02T12:00:00.000Z") }),
        ).rejects.toMatchObject({ statusCode: 400, detalhes: { codigo: "CAMPANHA_NAO_VIGENTE" } });
        expect(tx.processamentoNfce.create).not.toHaveBeenCalled();
    });

    it("compra fora do período da edição atual (ex.: reativada) → 400 NFCE_FORA_PERIODO", async () => {
        const { repo, tx } = prepararTx();

        await expect(
            processar(repo, 50, { dataEmissao: new Date("2026-08-20T12:00:00.000Z") }),
        ).rejects.toMatchObject({ statusCode: 400, detalhes: { codigo: "NFCE_FORA_PERIODO" } });
        expect(tx.processamentoNfce.create).not.toHaveBeenCalled();
    });

    it("campanha removida → 404", async () => {
        const { repo } = prepararTx({ campanha: null });

        await expect(processar(repo, 50)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("P2002 da chave UNIQUE global vira 409, mesmo em outra edição", async () => {
        const { repo, tx } = prepararTx({ campanha: { edicao: 3 }, erroCriarNfce: { code: "P2002" } });

        await expect(processar(repo, 669.86)).rejects.toMatchObject({
            statusCode: 409,
            message: "Nota fiscal ja utilizada",
        } satisfies Partial<ErroAplicacao>);
        expect(tx.residualTicketCampanha.update).not.toHaveBeenCalled();
        expect(tx.ticket.createMany).not.toHaveBeenCalled();
    });
});

describe("RepositorioProcessamentoNfce.buscarExtratoConsumidor", () => {
    it("filtra pelo consumidor e edição, inclui loja e faixa de tickets", async () => {
        const findMany = vi.fn().mockResolvedValue([
            {
                id: 5,
                valorNota: 25.5,
                ticketsGerados: 2,
                dataEmissao: EMISSAO,
                dataCriacao: AGORA,
                lojista: { nomeFantasia: "Loja A", cnpj: "38.281.946/0001-46" },
                tickets: [{ numero: 7 }, { numero: 8 }],
            },
            {
                id: 4,
                valorNota: 3,
                ticketsGerados: 0,
                dataEmissao: EMISSAO,
                dataCriacao: EMISSAO,
                lojista: { nomeFantasia: "Loja B", cnpj: "11.222.333/0001-81" },
                tickets: [],
            },
        ]);
        const findUnique = vi.fn().mockResolvedValue({ valorResidual: 8.5, ticketsTotais: 9 });
        const repo = new RepositorioProcessamentoNfce({
            processamentoNfce: { findMany },
            residualTicketCampanha: { findUnique },
        } as never);

        const extrato = await repo.buscarExtratoConsumidor(9, 1, 2);

        expect(findUnique).toHaveBeenCalledWith({
            where: { consumidorId_campanhaId_edicao: { consumidorId: 9, campanhaId: 1, edicao: 2 } },
        });
        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { consumidorId: 9, campanhaId: 1, edicao: 2 } }),
        );
        expect(extrato.totalTickets).toBe(9);
        expect(extrato.valorResidual).toBe(8.5);
        expect(extrato.notas[0]).toEqual({
            id: 5,
            valorNota: 25.5,
            ticketsGerados: 2,
            numerosTickets: { primeiro: 7, ultimo: 8 },
            dataEmissao: EMISSAO,
            dataLeitura: AGORA,
            loja: { nome: "Loja A", cnpj: "38.281.946/0001-46" },
        });
        expect(extrato.notas[1]!.numerosTickets).toBeNull();
    });

    it("sem residual retorna zero tickets", async () => {
        const repo = new RepositorioProcessamentoNfce({
            processamentoNfce: { findMany: vi.fn().mockResolvedValue([]) },
            residualTicketCampanha: { findUnique: vi.fn().mockResolvedValue(null) },
        } as never);

        await expect(repo.buscarExtratoConsumidor(9, 1, 1)).resolves.toEqual({
            totalTickets: 0,
            valorResidual: 0,
            notas: [],
        });
    });
});
