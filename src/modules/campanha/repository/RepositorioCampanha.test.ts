import { describe, expect, it, vi } from "vitest";
import { RepositorioCampanha } from "./RepositorioCampanha";

const AGORA = new Date("2026-09-10T12:00:00.000Z");
const INICIO = new Date("2026-10-01T03:00:00.000Z");
const FIM = new Date("2026-11-01T02:59:59.999Z");

function registro(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        nome: "Natal",
        nomeNormalizado: "natal",
        descricao: null,
        qrcode: null,
        dataInicio: new Date("2026-07-01T03:00:00.000Z"),
        dataFim: new Date("2026-08-01T02:59:59.999Z"),
        valorPorTicket: 10,
        ativa: false,
        edicao: 1,
        associacaoId: 3,
        dataCriacao: AGORA,
        dataAtualizacao: AGORA,
        ...overrides,
    };
}

/** Prisma em memória: tx e cliente raiz compartilham os mesmos mocks. */
function preparar(opcoes: {
    campanha?: Record<string, unknown> | null;
    tickets?: number;
    resultadosAtivos?: number;
    processamentos?: number;
    resultados?: number;
    conflito?: Record<string, unknown> | null;
    erroCriarSorteio?: unknown;
} = {}) {
    let atual = opcoes.campanha === null ? null : registro(opcoes.campanha ?? {});
    const ordem: string[] = [];
    const cliente = {
        $executeRaw: vi.fn(async () => {
            ordem.push("lock");
        }),
        campanha: {
            findUnique: vi.fn(async () => atual),
            findFirst: vi.fn(async () => opcoes.conflito ?? null),
            findMany: vi.fn(async () => (atual ? [atual] : [])),
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
                ordem.push("create-campanha");
                atual = registro({ ...data, id: 1, ativa: true, edicao: 1 });
                return atual;
            }),
            update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
                ordem.push("update-campanha");
                atual = { ...atual!, ...data };
                return atual;
            }),
            delete: vi.fn(async () => {
                ordem.push("delete-campanha");
            }),
        },
        sorteio: {
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
                ordem.push("create-sorteio");
                if (opcoes.erroCriarSorteio) {
                    throw opcoes.erroCriarSorteio;
                }
                return { id: 77, ...data };
            }),
            updateMany: vi.fn(async () => ({ count: 1 })),
            deleteMany: vi.fn(async () => {
                ordem.push("delete-sorteios");
                return { count: 1 };
            }),
            findMany: vi.fn(async () => (atual ? [{ id: 77, campanhaId: 1, edicao: atual.edicao, resultados: [] }] : [])),
        },
        ticket: {
            count: vi.fn(async () => opcoes.tickets ?? 0),
            groupBy: vi.fn(async () => []),
            deleteMany: vi.fn(async () => {
                ordem.push("delete-tickets");
                return { count: 0 };
            }),
        },
        resultadoSorteio: {
            count: vi.fn(async (args: { where: { situacao?: unknown } }) =>
                args.where.situacao ? (opcoes.resultadosAtivos ?? 0) : (opcoes.resultados ?? 0),
            ),
            deleteMany: vi.fn(async () => {
                ordem.push("delete-resultados");
                return { count: 0 };
            }),
        },
        processamentoNfce: {
            count: vi.fn(async () => opcoes.processamentos ?? 0),
            deleteMany: vi.fn(async () => {
                ordem.push("delete-notas");
                return { count: 0 };
            }),
        },
        residualTicketCampanha: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    };
    const prisma = {
        ...cliente,
        $transaction: async (fn: (tx: typeof cliente) => Promise<unknown>) => fn(cliente),
    };
    return { repo: new RepositorioCampanha(prisma as never), cliente, ordem };
}

const NOVO_PERIODO = { dataInicio: INICIO, dataFim: FIM, valorPorTicket: 20 };

describe("RepositorioCampanha", () => {
    describe("buscarSobrepostaAoPeriodo", () => {
        it("procura apenas campanhas ATIVAS cujo periodo cruza o informado", async () => {
            const { repo, cliente } = preparar();
            await repo.buscarSobrepostaAoPeriodo(INICIO, FIM);
            expect(cliente.campanha.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { ativa: true, dataInicio: { lte: FIM }, dataFim: { gte: INICIO } },
                }),
            );
        });

        it("ignora a propria campanha na edicao", async () => {
            const { repo, cliente } = preparar();
            await repo.buscarSobrepostaAoPeriodo(INICIO, FIM, 9);
            expect(cliente.campanha.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ id: { not: 9 } }) }),
            );
        });
    });

    describe("listarVigentesEm", () => {
        it("filtra por ativa e periodo", async () => {
            const { repo, cliente } = preparar();
            await repo.listarVigentesEm(AGORA);
            expect(cliente.campanha.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { ativa: true, dataInicio: { lte: AGORA }, dataFim: { gte: AGORA } },
                }),
            );
        });
    });

    describe("criarComSorteio", () => {
        it("cria campanha e sorteio da edicao 1 com snapshot na mesma transacao", async () => {
            const { repo, cliente, ordem } = preparar({ campanha: null });

            const resumo = await repo.criarComSorteio({
                nome: "Natal",
                nomeNormalizado: "natal",
                descricao: null,
                qrcode: null,
                dataInicio: INICIO,
                dataFim: FIM,
                valorPorTicket: 15,
                associacaoId: 3,
            });

            expect(ordem).toEqual(["create-campanha", "create-sorteio"]);
            expect(cliente.sorteio.create).toHaveBeenCalledWith({
                data: { campanhaId: 1, edicao: 1, dataInicioEdicao: INICIO, dataFimEdicao: FIM, valorPorTicketEdicao: 15 },
            });
            expect(resumo).toMatchObject({ sorteioId: 77, totalTickets: 0 });
        });

        it("falha ao criar o sorteio aborta a transacao com erro (sem campanha orfa)", async () => {
            const { repo } = preparar({ campanha: null, erroCriarSorteio: new Error("falha") });

            await expect(
                repo.criarComSorteio({
                    nome: "Natal",
                    nomeNormalizado: "natal",
                    descricao: null,
                    qrcode: null,
                    dataInicio: INICIO,
                    dataFim: FIM,
                    valorPorTicket: 15,
                    associacaoId: 3,
                }),
            ).rejects.toMatchObject({ statusCode: 500 });
        });

        it("P2002 do indice (associacao, nome normalizado) vira 409 CAMPANHA_NOME_DUPLICADO", async () => {
            const { repo, cliente } = preparar({ campanha: null });
            cliente.campanha.create.mockRejectedValueOnce({ code: "P2002" });

            await expect(
                repo.criarComSorteio({
                    nome: "Natal",
                    nomeNormalizado: "natal",
                    descricao: null,
                    qrcode: null,
                    dataInicio: INICIO,
                    dataFim: FIM,
                    valorPorTicket: 15,
                    associacaoId: 3,
                }),
            ).rejects.toMatchObject({ statusCode: 409, detalhes: { codigo: "CAMPANHA_NOME_DUPLICADO" } });
        });
    });

    describe("reativar", () => {
        it("trava, incrementa a edicao, grava periodo/valor e cria o sorteio da nova edicao", async () => {
            const { repo, cliente, ordem } = preparar({ tickets: 5, resultadosAtivos: 1 });

            await repo.reativar(1, NOVO_PERIODO, AGORA);

            expect(ordem).toEqual(["lock", "update-campanha", "create-sorteio"]);
            expect(cliente.campanha.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { edicao: 2, ativa: true, dataInicio: INICIO, dataFim: FIM, valorPorTicket: 20 },
            });
            expect(cliente.sorteio.create).toHaveBeenCalledWith({
                data: { campanhaId: 1, edicao: 2, dataInicioEdicao: INICIO, dataFimEdicao: FIM, valorPorTicketEdicao: 20 },
            });
        });

        it("sem valor informado reutiliza o valor atual", async () => {
            const { repo, cliente } = preparar();

            await repo.reativar(1, { dataInicio: INICIO, dataFim: FIM }, AGORA);

            expect(cliente.campanha.update.mock.calls[0]![0].data).not.toHaveProperty("valorPorTicket");
            expect(cliente.sorteio.create.mock.calls[0]![0].data).toMatchObject({ valorPorTicketEdicao: 10 });
        });

        it("edicao anterior sem tickets pode reativar sem sorteio realizado", async () => {
            const { repo, cliente } = preparar({ tickets: 0 });

            await repo.reativar(1, NOVO_PERIODO, AGORA);

            expect(cliente.resultadoSorteio.count).not.toHaveBeenCalled();
            expect(cliente.sorteio.create).toHaveBeenCalled();
        });

        it("edicao anterior com tickets e sem sorteio → 409 SORTEIO_PENDENTE", async () => {
            const { repo, cliente } = preparar({ tickets: 5, resultadosAtivos: 0 });

            await expect(repo.reativar(1, NOVO_PERIODO, AGORA)).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "SORTEIO_PENDENTE", edicao: 1 },
            });
            expect(cliente.campanha.update).not.toHaveBeenCalled();
        });

        it("entrega pendente da edicao anterior nao bloqueia (resultado ativo conta)", async () => {
            const { repo, cliente } = preparar({ tickets: 5, resultadosAtivos: 1 });

            await repo.reativar(1, NOVO_PERIODO, AGORA);

            expect(cliente.resultadoSorteio.count).toHaveBeenCalledWith({
                where: { situacao: { not: "CANCELADO" }, sorteio: { campanhaId: 1, edicao: 1 } },
            });
        });

        it("campanha ja ativa (outra reativacao venceu a corrida) → 409 CAMPANHA_JA_ATIVA", async () => {
            const { repo, cliente } = preparar({ campanha: { ativa: true } });

            await expect(repo.reativar(1, NOVO_PERIODO, AGORA)).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_JA_ATIVA" },
            });
            expect(cliente.sorteio.create).not.toHaveBeenCalled();
        });

        it("periodo anterior ainda nao terminou → 409 CAMPANHA_AINDA_VIGENTE", async () => {
            const { repo } = preparar({ campanha: { dataFim: new Date("2026-09-30T02:59:59.999Z") } });

            await expect(repo.reativar(1, NOVO_PERIODO, AGORA)).rejects.toMatchObject({
                detalhes: { codigo: "CAMPANHA_AINDA_VIGENTE" },
            });
        });

        it("novo periodo sobrepondo campanha ativa → 409 CAMPANHA_PERIODO_OCUPADO", async () => {
            const { repo } = preparar({ conflito: { id: 4, nome: "Outra" } });

            await expect(repo.reativar(1, NOVO_PERIODO, AGORA)).rejects.toMatchObject({
                detalhes: { codigo: "CAMPANHA_PERIODO_OCUPADO", campanhaConflitanteId: 4 },
            });
        });

        it("P2002 do sorteio (campanha, edicao) → 409 OPERACAO_CONCORRENTE", async () => {
            const { repo } = preparar({ erroCriarSorteio: { code: "P2002" } });

            await expect(repo.reativar(1, NOVO_PERIODO, AGORA)).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "OPERACAO_CONCORRENTE" },
            });
        });
    });

    describe("atualizar", () => {
        it("muda periodo de edicao sem NFC-e e sincroniza o snapshot do sorteio", async () => {
            const { repo, cliente } = preparar({ campanha: { ativa: true, edicao: 2 } });

            await repo.atualizar(1, { dataFim: FIM, valorPorTicket: 12 });

            expect(cliente.processamentoNfce.count).toHaveBeenCalledWith({ where: { campanhaId: 1, edicao: 2 } });
            expect(cliente.sorteio.updateMany).toHaveBeenCalledWith({
                where: { campanhaId: 1, edicao: 2 },
                data: expect.objectContaining({ dataFimEdicao: FIM, valorPorTicketEdicao: 12 }),
            });
        });

        it("edicao que ja recebeu NFC-e (mesmo com 0 ticket) → 409 CAMPANHA_EDICAO_EM_USO", async () => {
            const { repo, cliente } = preparar({ campanha: { ativa: true }, processamentos: 1 });

            await expect(repo.atualizar(1, { valorPorTicket: 12 })).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_EDICAO_EM_USO" },
            });
            expect(cliente.campanha.update).not.toHaveBeenCalled();
        });

        it("mudar so o nome nao consulta NFC-e nem mexe no sorteio", async () => {
            const { repo, cliente } = preparar({ campanha: { ativa: true }, processamentos: 3 });

            await repo.atualizar(1, { nome: "Novo", nomeNormalizado: "novo" });

            expect(cliente.processamentoNfce.count).not.toHaveBeenCalled();
            expect(cliente.sorteio.updateMany).not.toHaveBeenCalled();
        });
    });

    describe("deletar", () => {
        it("campanha vazia: remove o sorteio automatico e a campanha", async () => {
            const { repo, ordem } = preparar();

            await repo.deletar(1);

            expect(ordem).toEqual([
                "lock",
                "delete-resultados",
                "delete-tickets",
                "delete-notas",
                "delete-sorteios",
                "delete-campanha",
            ]);
        });

        it("com tickets sem confirmacao → 409 CAMPANHA_COM_TICKETS com as contagens", async () => {
            const { repo, cliente } = preparar({ tickets: 2, processamentos: 1, resultados: 1 });

            await expect(repo.deletar(1)).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_COM_TICKETS", totalTickets: 2, totalNotas: 1, totalResultados: 1 },
            });
            expect(cliente.campanha.delete).not.toHaveBeenCalled();
            expect(cliente.ticket.deleteMany).not.toHaveBeenCalled();
        });

        it("com confirmacao (forcar) apaga resultados, tickets, notas, sorteios e a campanha", async () => {
            const { repo, ordem } = preparar({ tickets: 2, processamentos: 1, resultados: 1 });

            await repo.deletar(1, true);

            expect(ordem).toEqual([
                "lock",
                "delete-resultados",
                "delete-tickets",
                "delete-notas",
                "delete-sorteios",
                "delete-campanha",
            ]);
        });

        it.each([
            ["processamento de NFC-e", { processamentos: 1 }],
            ["resultado de sorteio", { resultados: 1 }],
        ])("com %s → 409 CAMPANHA_COM_HISTORICO", async (_caso, opcoes) => {
            const { repo, cliente } = preparar(opcoes);

            await expect(repo.deletar(1)).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_COM_HISTORICO" },
            });
            expect(cliente.campanha.delete).not.toHaveBeenCalled();
        });

        it("P2003 inesperado vira 409, nao 500 generico", async () => {
            const { repo, cliente } = preparar();
            cliente.campanha.delete.mockRejectedValueOnce({ code: "P2003" });

            await expect(repo.deletar(1)).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_COM_HISTORICO" },
            });
        });
    });
});
