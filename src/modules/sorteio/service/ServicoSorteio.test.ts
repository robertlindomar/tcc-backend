import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { Campanha } from "../../campanha/model/Campanha";
import { RepositorioCampanha } from "../../campanha/repository/RepositorioCampanha";
import { ResultadoSorteio, SituacaoResultadoSorteio, Sorteio } from "../model/Sorteio";
import { RepositorioSorteio } from "../repository/RepositorioSorteio";
import { SortearNumero } from "../utils/sortearNumero";
import { ServicoSorteio } from "./ServicoSorteio";

const AGORA = new Date("2026-10-05T12:00:00.000Z");
const FIM_PASSADO = new Date("2026-09-30T23:59:59.000Z");
const FIM_FUTURO = new Date("2026-12-31T23:59:59.000Z");

function associacaoFake(id = 3): Associacao {
    return new Associacao({
        id,
        nomeFantasia: "Associacao Sorteio",
        razaoSocial: "Associacao Sorteio LTDA",
        cnpj: "55.666.777/0001-88",
        inscricaoEstadual: null,
        usuarioId: 20,
        dataCriacao: AGORA,
        dataAtualizacao: AGORA,
    });
}

function campanhaFake(associacaoId: number, id = 10): Campanha {
    return new Campanha({
        id,
        nome: "Campanha Base",
        descricao: null,
        qrcode: null,
        dataInicio: new Date("2026-09-01T00:00:00.000Z"),
        dataFim: FIM_PASSADO,
        valorPorTicket: 10,
        associacaoId,
        dataCriacao: AGORA,
        dataAtualizacao: AGORA,
    });
}

function resultadoFake(
    id: number,
    numeroSorteado: number,
    situacao: SituacaoResultadoSorteio,
): ResultadoSorteio {
    return {
        id,
        ticketId: 100 + numeroSorteado,
        numeroSorteado,
        totalTickets: 5,
        situacao,
        dataSorteio: AGORA,
        dataAtualizacao: AGORA,
        vencedor: {
            consumidorId: 9,
            nome: "Maria",
            email: "maria@email.com",
            cpf: "123.456.789-09",
        },
    };
}

function sorteioFake(
    opcoes: {
        dataFimCampanha?: Date;
        totalTickets?: number;
        resultados?: ResultadoSorteio[];
    } = {},
): Sorteio {
    return new Sorteio({
        id: 1,
        qrcode: null,
        campanhaId: 10,
        dataFimCampanha: opcoes.dataFimCampanha ?? FIM_PASSADO,
        totalTickets: opcoes.totalTickets ?? 5,
        resultados: opcoes.resultados ?? [],
        dataCriacao: AGORA,
        dataAtualizacao: AGORA,
    });
}

describe("ServicoSorteio", () => {
    let repositorioSorteioMock: {
        criar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
        buscarTicketIdPorNumero: ReturnType<typeof vi.fn>;
        registrarResultado: ReturnType<typeof vi.fn>;
        confirmarEntrega: ReturnType<typeof vi.fn>;
    };
    let repositorioCampanhaMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let sortearNumero: ReturnType<typeof vi.fn<SortearNumero>>;
    let servico: ServicoSorteio;

    beforeEach(() => {
        repositorioSorteioMock = {
            criar: vi.fn(),
            buscar: vi.fn(),
            deletar: vi.fn(),
            buscarTicketIdPorNumero: vi.fn(async (_campanhaId: number, numero: number) => 100 + numero),
            registrarResultado: vi.fn(),
            confirmarEntrega: vi.fn().mockResolvedValue(true),
        };
        repositorioCampanhaMock = {
            buscar: vi.fn().mockResolvedValue(campanhaFake(3, 10)),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(associacaoFake(3)),
        };
        sortearNumero = vi.fn<SortearNumero>();
        servico = new ServicoSorteio(
            repositorioSorteioMock as unknown as RepositorioSorteio,
            repositorioCampanhaMock as unknown as RepositorioCampanha,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
            sortearNumero,
            () => AGORA,
        );
    });

    it("cria sorteio quando campanha pertence a associacao logada", async () => {
        repositorioSorteioMock.criar.mockResolvedValue(sorteioFake());

        const resultado = await servico.criar(20, { campanhaId: 10, qrcode: "qr-sorteio" });

        expect(repositorioCampanhaMock.buscar).toHaveBeenCalledWith(10);
        expect(repositorioSorteioMock.criar).toHaveBeenCalledWith({
            campanhaId: 10,
            qrcode: "qr-sorteio",
        });
        expect(resultado).toMatchObject({
            id: 1,
            campanhaId: 10,
            totalTickets: 5,
            campanhaEncerrada: true,
            resultadoAtual: null,
            historico: [],
        });
    });

    it("retorna 404 quando campanha pertence a outra associacao", async () => {
        repositorioCampanhaMock.buscar.mockResolvedValue(campanhaFake(999, 10));

        const promessa = servico.criar(20, { campanhaId: 10, qrcode: null });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Campanha nao encontrada",
            statusCode: 404,
        });
        expect(repositorioSorteioMock.criar).not.toHaveBeenCalled();
    });

    describe("sortear", () => {
        it("sorteia numero entre 1 e o total e registra o ticket", async () => {
            const depois = sorteioFake({ resultados: [resultadoFake(1, 3, "AGUARDANDO_ENTREGA")] });
            repositorioSorteioMock.buscar
                .mockResolvedValueOnce(sorteioFake())
                .mockResolvedValueOnce(depois);
            sortearNumero.mockReturnValue(3);

            const resposta = await servico.sortear(20, "1");

            expect(sortearNumero).toHaveBeenCalledWith(1, 5);
            expect(repositorioSorteioMock.buscarTicketIdPorNumero).toHaveBeenCalledWith(10, 3);
            expect(repositorioSorteioMock.registrarResultado).toHaveBeenCalledWith({
                sorteioId: 1,
                ticketId: 103,
                numeroSorteado: 3,
                totalTickets: 5,
                cancelarResultadoId: undefined,
            });
            expect(resposta.resultadoAtual).toMatchObject({
                numeroSorteado: 3,
                situacao: "AGUARDANDO_ENTREGA",
                vencedor: {
                    nome: "Maria",
                    email: "maria@email.com",
                    cpfMascarado: "***.456.789-**",
                },
            });
        });

        it("campanha ainda nao terminou → 409", async () => {
            repositorioSorteioMock.buscar.mockResolvedValue(
                sorteioFake({ dataFimCampanha: FIM_FUTURO }),
            );

            await expect(servico.sortear(20, "1")).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_NAO_ENCERRADA" },
            });
            expect(repositorioSorteioMock.registrarResultado).not.toHaveBeenCalled();
        });

        it("campanha sem tickets → 409", async () => {
            repositorioSorteioMock.buscar.mockResolvedValue(sorteioFake({ totalTickets: 0 }));

            await expect(servico.sortear(20, "1")).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "SEM_TICKETS" },
            });
            expect(sortearNumero).not.toHaveBeenCalled();
        });

        it("ja existe resultado ativo → 409", async () => {
            repositorioSorteioMock.buscar.mockResolvedValue(
                sorteioFake({ resultados: [resultadoFake(1, 2, "AGUARDANDO_ENTREGA")] }),
            );

            await expect(servico.sortear(20, "1")).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "SORTEIO_JA_REALIZADO" },
            });
        });

        it("sorteio de outra associacao → 404", async () => {
            repositorioSorteioMock.buscar.mockResolvedValue(sorteioFake());
            repositorioCampanhaMock.buscar.mockResolvedValue(campanhaFake(999, 10));

            await expect(servico.sortear(20, "1")).rejects.toMatchObject({
                statusCode: 404,
                message: "Sorteio nao encontrado",
            });
            expect(sortearNumero).not.toHaveBeenCalled();
        });
    });

    describe("refazer", () => {
        it("cancela o pendente e sorteia outro numero, sem repetir cancelados", async () => {
            const antes = sorteioFake({
                resultados: [
                    resultadoFake(2, 4, "AGUARDANDO_ENTREGA"),
                    resultadoFake(1, 1, "CANCELADO"),
                ],
            });
            repositorioSorteioMock.buscar.mockResolvedValue(antes);
            sortearNumero.mockReturnValueOnce(4).mockReturnValueOnce(1).mockReturnValueOnce(5);

            await servico.refazer(20, "1");

            expect(sortearNumero).toHaveBeenCalledTimes(3);
            expect(repositorioSorteioMock.registrarResultado).toHaveBeenCalledWith({
                sorteioId: 1,
                ticketId: 105,
                numeroSorteado: 5,
                totalTickets: 5,
                cancelarResultadoId: 2,
            });
        });

        it("premio ja entregue → 409", async () => {
            repositorioSorteioMock.buscar.mockResolvedValue(
                sorteioFake({ resultados: [resultadoFake(1, 2, "ENTREGUE")] }),
            );

            await expect(servico.refazer(20, "1")).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "PREMIO_JA_ENTREGUE" },
            });
        });

        it("sem tickets elegiveis restantes → 409", async () => {
            repositorioSorteioMock.buscar.mockResolvedValue(
                sorteioFake({
                    totalTickets: 2,
                    resultados: [
                        resultadoFake(2, 2, "AGUARDANDO_ENTREGA"),
                        resultadoFake(1, 1, "CANCELADO"),
                    ],
                }),
            );

            await expect(servico.refazer(20, "1")).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "SEM_TICKETS" },
            });
        });
    });

    describe("confirmarEntrega", () => {
        it("marca o pendente como entregue", async () => {
            repositorioSorteioMock.buscar
                .mockResolvedValueOnce(
                    sorteioFake({ resultados: [resultadoFake(7, 2, "AGUARDANDO_ENTREGA")] }),
                )
                .mockResolvedValueOnce(sorteioFake({ resultados: [resultadoFake(7, 2, "ENTREGUE")] }));

            const resposta = await servico.confirmarEntrega(20, "1");

            expect(repositorioSorteioMock.confirmarEntrega).toHaveBeenCalledWith(7);
            expect(resposta.resultadoAtual?.situacao).toBe("ENTREGUE");
        });

        it("ja entregue e idempotente", async () => {
            repositorioSorteioMock.buscar.mockResolvedValue(
                sorteioFake({ resultados: [resultadoFake(7, 2, "ENTREGUE")] }),
            );

            await servico.confirmarEntrega(20, "1");

            expect(repositorioSorteioMock.confirmarEntrega).not.toHaveBeenCalled();
        });

        it("sem resultado → 409", async () => {
            repositorioSorteioMock.buscar.mockResolvedValue(sorteioFake());

            await expect(servico.confirmarEntrega(20, "1")).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "SORTEIO_NAO_REALIZADO" },
            });
        });
    });

    it("nao exclui sorteio ja realizado", async () => {
        repositorioSorteioMock.buscar.mockResolvedValue(
            sorteioFake({ resultados: [resultadoFake(1, 2, "CANCELADO")] }),
        );

        await expect(servico.deletar(20, "1")).rejects.toMatchObject({ statusCode: 409 });
        expect(repositorioSorteioMock.deletar).not.toHaveBeenCalled();
    });
});
