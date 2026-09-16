import { describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Campanha } from "../../campanha/model/Campanha";
import { Lojista } from "../../lojista/model/Lojista";
import { AdaptadorLeituraNfce } from "../adaptador/AdaptadorLeituraNfce";
import { ServicoProcessarNfce } from "./ServicoProcessarNfce";

const CHAVE_BASICO = "35260838281946000146650010000042331599885707";
const CNPJ_BASICO = "38.281.946/0001-46";

function campanha(overrides: Partial<{
    id: number;
    dataInicio: Date;
    dataFim: Date;
    valorPorTicket: number;
    associacaoId: number;
}> = {}) {
    return new Campanha({
        id: overrides.id ?? 1,
        nome: "Natal",
        descricao: null,
        qrcode: null,
        dataInicio: overrides.dataInicio ?? new Date("2026-01-01T00:00:00.000Z"),
        dataFim: overrides.dataFim ?? new Date("2027-12-31T23:59:59.999Z"),
        valorPorTicket: overrides.valorPorTicket ?? 10,
        associacaoId: overrides.associacaoId ?? 1,
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
    });
}

function lojista(overrides: Partial<{
    id: number;
    status: StatusLojista;
    associacaoId: number;
    cnpj: string;
}> = {}) {
    return new Lojista({
        id: overrides.id ?? 2,
        nomeFantasia: "BÁSICO BRASIL",
        razaoSocial: "ANDREATTI & TRIVELATO ARTIGOS DO VESTUARIO LTDA",
        cnpj: overrides.cnpj ?? CNPJ_BASICO,
        inscricaoEstadual: null,
        status: overrides.status ?? StatusLojista.APROVADO,
        usuarioId: 10,
        associacaoId: overrides.associacaoId ?? 1,
        enderecoId: null,
        justificativaRejeicao: null,
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
    });
}

function criarServico(deps: {
    adaptador?: Partial<AdaptadorLeituraNfce>;
    campanhaRepo?: {
        buscar?: ReturnType<typeof vi.fn>;
        listarVigentesEm?: ReturnType<typeof vi.fn>;
    };
    lojistaRepo?: { buscarPorCnpj?: ReturnType<typeof vi.fn> };
    processamentoRepo?: { processarComCredito?: ReturnType<typeof vi.fn> };
}) {
    const adaptador: AdaptadorLeituraNfce = {
        consultar: vi.fn().mockResolvedValue({
            chaveAcesso: CHAVE_BASICO,
            cnpjEmitente: CNPJ_BASICO,
            valorTotal: 669.86,
            dataEmissao: new Date("2026-08-15T14:22:03.000Z"),
            status: "AUTORIZADA" as const,
            uf: "SP",
            modelo: 65 as const,
            ambiente: "DEMO" as const,
            provider: "simulado" as const,
        }),
        ...deps.adaptador,
    };

    const repositorioCampanha = {
        buscar: vi.fn().mockResolvedValue(campanha()),
        listarVigentesEm: vi.fn().mockResolvedValue([campanha()]),
        ...deps.campanhaRepo,
    };

    const repositorioLojista = {
        buscarPorCnpj: vi.fn().mockResolvedValue(lojista()),
        ...deps.lojistaRepo,
    };

    const repositorioProcessamento = {
        processarComCredito: vi.fn().mockResolvedValue({
            processamentoId: 11,
            campanhaId: 1,
            consumidorId: 9,
            lojistaId: 2,
            chaveAcesso: CHAVE_BASICO,
            valorNota: 669.86,
            ticketsGerados: 66,
            residualAntes: 0,
            residualApos: 9.86,
            ticketsTotaisCampanha: 66,
            dataEmissao: new Date("2026-08-15T14:22:03.000Z"),
        }),
        ...deps.processamentoRepo,
    };

    return {
        servico: new ServicoProcessarNfce(
            adaptador,
            repositorioCampanha as never,
            repositorioLojista as never,
            repositorioProcessamento as never,
        ),
        adaptador,
        repositorioCampanha,
        repositorioLojista,
        repositorioProcessamento,
    };
}

describe("ServicoProcessarNfce", () => {
    it("credita tickets na campanha vigente unica", async () => {
        const { servico, repositorioProcessamento } = criarServico({});

        const resultado = await servico.processar({
            consumidorId: 9,
            payloadQr: `tcc://nfce-demo?chave=${CHAVE_BASICO}`,
        });

        expect(resultado.ticketsGerados).toBe(66);
        expect(resultado.modoSimulado).toBe(true);
        expect(repositorioProcessamento.processarComCredito).toHaveBeenCalledWith(
            expect.objectContaining({
                consumidorId: 9,
                campanhaId: 1,
                lojistaId: 2,
                valorNota: 669.86,
                valorPorTicket: 10,
            }),
        );
    });

    it("replay da mesma chave propaga 409 do repositorio", async () => {
        const { servico } = criarServico({
            processamentoRepo: {
                processarComCredito: vi
                    .fn()
                    .mockRejectedValue(new ErroAplicacao("Nota fiscal ja utilizada", 409)),
            },
        });

        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "chave-demo", campanhaId: 1 }),
        ).rejects.toMatchObject({ statusCode: 409, message: "Nota fiscal ja utilizada" });
    });

    it("loja nao aprovada → 400", async () => {
        const { servico } = criarServico({
            lojistaRepo: {
                buscarPorCnpj: vi.fn().mockResolvedValue(
                    lojista({ status: StatusLojista.PENDENTE }),
                ),
            },
        });

        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "qr", campanhaId: 1 }),
        ).rejects.toMatchObject({ statusCode: 400, message: "Loja nao aprovada" });
    });

    it("loja inexistente → 404", async () => {
        const { servico } = criarServico({
            lojistaRepo: { buscarPorCnpj: vi.fn().mockResolvedValue(null) },
        });

        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "qr", campanhaId: 1 }),
        ).rejects.toMatchObject({ statusCode: 404, message: "Loja nao cadastrada" });
    });

    it("data da compra fora do periodo → 400", async () => {
        const { servico } = criarServico({
            adaptador: {
                consultar: vi.fn().mockResolvedValue({
                    chaveAcesso: CHAVE_BASICO,
                    cnpjEmitente: CNPJ_BASICO,
                    valorTotal: 669.86,
                    dataEmissao: new Date("2025-01-01T12:00:00.000Z"),
                    status: "AUTORIZADA" as const,
                    uf: "SP",
                    modelo: 65 as const,
                    ambiente: "DEMO" as const,
                    provider: "simulado" as const,
                }),
            },
        });

        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "qr", campanhaId: 1 }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Data da compra fora do periodo da campanha",
        });
    });

    it("NFC-e cancelada → 400", async () => {
        const { servico } = criarServico({
            adaptador: {
                consultar: vi.fn().mockRejectedValue(new Error("NFCE_CANCELADA")),
            },
        });
        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "qr", campanhaId: 1 }),
        ).rejects.toMatchObject({ statusCode: 400, message: "NFC-e cancelada" });
    });

    it("valor indisponivel na fonte SEFAZ → 422", async () => {
        const { servico } = criarServico({
            adaptador: {
                consultar: vi.fn().mockResolvedValue({
                    chaveAcesso: CHAVE_BASICO,
                    cnpjEmitente: CNPJ_BASICO,
                    valorTotal: null,
                    dataEmissao: null,
                    status: "AUTORIZADA" as const,
                    uf: "SP",
                    modelo: 65 as const,
                    ambiente: "PRODUCAO" as const,
                    provider: "sefaz" as const,
                    cStat: "100",
                }),
            },
        });
        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "qr", campanhaId: 1 }),
        ).rejects.toMatchObject({ statusCode: 422 });
    });

    it("SEFAZ indisponivel → 503", async () => {
        const { servico } = criarServico({
            adaptador: {
                consultar: vi.fn().mockRejectedValue(new Error("SEFAZ_INDISPONIVEL")),
            },
        });
        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "qr", campanhaId: 1 }),
        ).rejects.toMatchObject({ statusCode: 503, message: "SEFAZ indisponivel" });
    });

    it("loja de outra associacao → 400", async () => {
        const { servico } = criarServico({
            lojistaRepo: {
                buscarPorCnpj: vi.fn().mockResolvedValue(lojista({ associacaoId: 99 })),
            },
        });

        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "qr", campanhaId: 1 }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Loja nao participa desta campanha",
        });
    });

    it("varias campanhas vigentes sem campanhaId → 400", async () => {
        const { servico } = criarServico({
            campanhaRepo: {
                listarVigentesEm: vi
                    .fn()
                    .mockResolvedValue([campanha({ id: 1 }), campanha({ id: 2 })]),
            },
        });

        await expect(
            servico.processar({ consumidorId: 9, payloadQr: "qr" }),
        ).rejects.toMatchObject({ statusCode: 400, message: "Informe a campanha" });
    });

    it("residual e por campanha: campanhaId explicito nao mistura saldo", async () => {
        const { servico, repositorioProcessamento, repositorioCampanha } = criarServico({
            campanhaRepo: {
                buscar: vi.fn().mockResolvedValue(campanha({ id: 2, associacaoId: 1 })),
            },
        });

        await servico.processar({
            consumidorId: 9,
            payloadQr: "qr",
            campanhaId: 2,
        });

        expect(repositorioCampanha.buscar).toHaveBeenCalledWith(2);
        expect(repositorioProcessamento.processarComCredito).toHaveBeenCalledWith(
            expect.objectContaining({ campanhaId: 2, consumidorId: 9 }),
        );
    });
});
