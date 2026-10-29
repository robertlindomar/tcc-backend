import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { Campanha } from "../model/Campanha";
import { EdicaoCampanha, RepositorioCampanha, ResumoCampanha } from "../repository/RepositorioCampanha";
import { ServicoCampanha } from "./ServicoCampanha";

const AGORA = new Date("2026-09-01T12:00:00.000Z");

function associacaoFake(id = 3): Associacao {
    return new Associacao({
        id,
        nomeFantasia: "Associacao Campanha",
        razaoSocial: "Associacao Campanha LTDA",
        cnpj: "11.222.333/0001-44",
        inscricaoEstadual: null,
        usuarioId: 20,
        dataCriacao: AGORA,
        dataAtualizacao: AGORA,
    });
}

function campanhaFake(overrides: Partial<{
    id: number;
    nome: string;
    dataInicio: Date;
    dataFim: Date;
    valorPorTicket: number;
    ativa: boolean;
    edicao: number;
    associacaoId: number;
}> = {}): Campanha {
    return new Campanha({
        id: overrides.id ?? 1,
        nome: overrides.nome ?? "Campanha Verao",
        descricao: "Desc",
        qrcode: "qr-1",
        dataInicio: overrides.dataInicio ?? new Date("2026-09-01T03:00:00.000Z"),
        dataFim: overrides.dataFim ?? new Date("2026-12-31T02:59:59.999Z"),
        valorPorTicket: overrides.valorPorTicket ?? 10,
        ativa: overrides.ativa ?? true,
        edicao: overrides.edicao ?? 1,
        associacaoId: overrides.associacaoId ?? 3,
        dataCriacao: AGORA,
        dataAtualizacao: AGORA,
    });
}

function resumoFake(
    campanha: Campanha = campanhaFake(),
    extra: Partial<Omit<ResumoCampanha, "campanha">> = {},
): ResumoCampanha {
    return { campanha, totalTickets: 0, sorteioId: 50, situacaoResultado: null, ...extra };
}

const ENCERRADA = { dataInicio: new Date("2026-07-01T03:00:00.000Z"), dataFim: new Date("2026-08-01T02:59:59.999Z") };

describe("ServicoCampanha", () => {
    let repo: {
        criarComSorteio: ReturnType<typeof vi.fn>;
        listarResumoPorAssociacaoId: ReturnType<typeof vi.fn>;
        buscarResumo: ReturnType<typeof vi.fn>;
        buscarPorNomeNormalizado: ReturnType<typeof vi.fn>;
        buscarSobrepostaAoPeriodo: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        inativar: ReturnType<typeof vi.fn>;
        reativar: ReturnType<typeof vi.fn>;
        listarEdicoes: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoCampanha;

    afterEach(() => {
        vi.useRealTimers();
    });

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(AGORA);
        repo = {
            criarComSorteio: vi.fn().mockResolvedValue(resumoFake()),
            listarResumoPorAssociacaoId: vi.fn(),
            buscarResumo: vi.fn().mockResolvedValue(resumoFake()),
            buscarPorNomeNormalizado: vi.fn().mockResolvedValue(null),
            buscarSobrepostaAoPeriodo: vi.fn().mockResolvedValue(null),
            atualizar: vi.fn().mockResolvedValue(resumoFake()),
            inativar: vi.fn(),
            reativar: vi.fn(),
            listarEdicoes: vi.fn(),
            deletar: vi.fn(),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(associacaoFake(3)),
        };
        servico = new ServicoCampanha(
            repo as unknown as RepositorioCampanha,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
        );
    });

    describe("criar", () => {
        it("cria campanha + sorteio da edicao 1 e devolve sorteioId", async () => {
            const resultado = await servico.criar(20, {
                nome: "  Campanha   Verao ",
                descricao: "Desc",
                qrcode: "qr-1",
                dataInicio: "2026-09-01",
                dataFim: "2026-12-31",
                valorPorTicket: 10,
            });

            expect(repositorioAssociacaoMock.buscarPorUsuarioId).toHaveBeenCalledWith(20);
            expect(repo.criarComSorteio).toHaveBeenCalledWith(
                expect.objectContaining({
                    nome: "Campanha Verao",
                    nomeNormalizado: "campanha verao",
                    associacaoId: 3,
                    valorPorTicket: 10,
                }),
            );
            expect(resultado).toMatchObject({
                id: 1,
                nome: "Campanha Verao",
                ativa: true,
                edicao: 1,
                totalTickets: 0,
                sorteioId: 50,
                periodoEncerrado: false,
                situacaoSorteio: "AGUARDANDO_ENCERRAMENTO",
                dataInicioCivil: "2026-09-01",
                dataFimCivil: "2026-12-30",
            });
        });

        it("recusa nome duplicado mesmo com acento, caixa e espacos diferentes", async () => {
            repo.buscarPorNomeNormalizado.mockResolvedValue(campanhaFake({ id: 9, nome: "Ótica Verão" }));

            await expect(
                servico.criar(20, {
                    nome: "  OTICA   verao ",
                    dataInicio: "2026-10-01",
                    dataFim: "2026-10-31",
                    valorPorTicket: 10,
                }),
            ).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_NOME_DUPLICADO", campanhaConflitanteId: 9 },
            });
            expect(repo.buscarPorNomeNormalizado).toHaveBeenCalledWith(3, "otica verao", undefined);
            expect(repo.criarComSorteio).not.toHaveBeenCalled();
        });

        it("unicidade do nome e por associacao (consulta so a associacao logada)", async () => {
            repositorioAssociacaoMock.buscarPorUsuarioId.mockResolvedValue(associacaoFake(8));

            await servico.criar(21, {
                nome: "Natal",
                dataInicio: "2026-10-01",
                dataFim: "2026-10-31",
                valorPorTicket: 10,
            });

            expect(repo.buscarPorNomeNormalizado).toHaveBeenCalledWith(8, "natal", undefined);
            expect(repo.criarComSorteio).toHaveBeenCalledWith(expect.objectContaining({ associacaoId: 8 }));
        });

        it("propaga 409 do banco quando outra requisicao grava o mesmo nome antes", async () => {
            repo.criarComSorteio.mockRejectedValue(
                new ErroAplicacao("Ja existe uma campanha com esse nome", 409, { codigo: "CAMPANHA_NOME_DUPLICADO" }),
            );

            await expect(
                servico.criar(20, { nome: "X", dataInicio: "2026-10-01", dataFim: "2026-10-31", valorPorTicket: 10 }),
            ).rejects.toMatchObject({ statusCode: 409, detalhes: { codigo: "CAMPANHA_NOME_DUPLICADO" } });
        });

        it("recusa valorPorTicket <= 0", async () => {
            await expect(
                servico.criar(20, { nome: "X", dataInicio: "2026-09-01", dataFim: "2026-12-31", valorPorTicket: 0 }),
            ).rejects.toMatchObject({
                message: "Valor por ticket deve ser maior que zero",
                statusCode: 400,
            } satisfies Partial<ErroAplicacao>);
            expect(repo.criarComSorteio).not.toHaveBeenCalled();
        });

        it("recusa nome vazio", async () => {
            await expect(
                servico.criar(20, { nome: "   ", dataInicio: "2026-09-01", dataFim: "2026-12-31", valorPorTicket: 10 }),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it("recusa dataFim anterior a dataInicio", async () => {
            await expect(
                servico.criar(20, { nome: "X", dataInicio: "2026-12-31", dataFim: "2026-09-01", valorPorTicket: 10 }),
            ).rejects.toMatchObject({
                message: "Data de fim deve ser maior ou igual a data de inicio",
                statusCode: 400,
            });
            expect(repo.criarComSorteio).not.toHaveBeenCalled();
        });

        it("recusa criar campanha com inicio anterior a hoje", async () => {
            await expect(
                servico.criar(20, { nome: "X", dataInicio: "2026-08-31", dataFim: "2026-12-31", valorPorTicket: 10 }),
            ).rejects.toMatchObject({ message: "dataInicio nao pode ser anterior a hoje", statusCode: 400 });
        });

        it("recusa criar campanha com ano de mais de 4 digitos", async () => {
            await expect(
                servico.criar(20, { nome: "X", dataInicio: "2026-09-01", dataFim: "123456-01-01", valorPorTicket: 10 }),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it("recusa periodo sobreposto a outra campanha ativa", async () => {
            repo.buscarSobrepostaAoPeriodo.mockResolvedValue(campanhaFake({ id: 7, nome: "Natal" }));

            await expect(
                servico.criar(20, { nome: "Nova", dataInicio: "2026-10-01", dataFim: "2026-10-31", valorPorTicket: 10 }),
            ).rejects.toMatchObject({
                message: 'Ja existe a campanha "Natal" nesse periodo',
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_PERIODO_OCUPADO", campanhaConflitanteId: 7 },
            });
            expect(repo.criarComSorteio).not.toHaveBeenCalled();
        });
    });

    describe("atualizar", () => {
        it("editar campanha ja iniciada reenviando o mesmo periodo/valor nao mexe na edicao", async () => {
            vi.setSystemTime(new Date("2026-10-27T15:00:00.000Z"));

            await servico.atualizar(20, "1", {
                nome: "Novo nome",
                dataInicio: "2026-09-01",
                dataFim: "2026-12-30",
                valorPorTicket: 10,
            });

            expect(repo.atualizar).toHaveBeenCalledWith(1, { nome: "Novo nome", nomeNormalizado: "novo nome" });
        });

        it("valida nome unico ignorando a propria campanha", async () => {
            await servico.atualizar(20, "1", { nome: "Renomeada" });

            expect(repo.buscarPorNomeNormalizado).toHaveBeenCalledWith(3, "renomeada", 1);
        });

        it("recusa renomear para nome de outra campanha", async () => {
            repo.buscarPorNomeNormalizado.mockResolvedValue(campanhaFake({ id: 2, nome: "Natal" }));

            await expect(servico.atualizar(20, "1", { nome: "natal" })).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_NOME_DUPLICADO" },
            });
            expect(repo.atualizar).not.toHaveBeenCalled();
        });

        it("ignora a propria campanha ao verificar o periodo", async () => {
            await servico.atualizar(20, "1", { nome: "Renomeada" });

            expect(repo.buscarSobrepostaAoPeriodo).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), 1);
        });

        it("recusa editar para periodo de outra campanha ativa", async () => {
            repo.buscarSobrepostaAoPeriodo.mockResolvedValue(campanhaFake({ id: 2, nome: "Black Friday" }));

            await expect(servico.atualizar(20, "1", { dataFim: "2027-01-31" })).rejects.toMatchObject({ statusCode: 409 });
            expect(repo.atualizar).not.toHaveBeenCalled();
        });

        it("propaga 409 CAMPANHA_EDICAO_EM_USO do repositorio ao mudar valor com NFC-e processada", async () => {
            repo.atualizar.mockRejectedValue(
                new ErroAplicacao("Periodo e valor por ticket nao podem mudar", 409, { codigo: "CAMPANHA_EDICAO_EM_USO" }),
            );

            await expect(servico.atualizar(20, "1", { valorPorTicket: 20 })).rejects.toMatchObject({
                detalhes: { codigo: "CAMPANHA_EDICAO_EM_USO" },
            });
            expect(repo.atualizar).toHaveBeenCalledWith(1, { valorPorTicket: 20 });
        });

        it("campanha de outra associacao → 404", async () => {
            repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ associacaoId: 999 })));

            await expect(servico.atualizar(20, "1", { nome: "X" })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe("inativar e reativar", () => {
        it("inativa sem apagar historico", async () => {
            repo.inativar.mockResolvedValue(resumoFake(campanhaFake({ ativa: false }), { totalTickets: 12 }));

            const resposta = await servico.inativar(20, "1");

            expect(repo.inativar).toHaveBeenCalledWith(1);
            expect(resposta).toMatchObject({ ativa: false, totalTickets: 12 });
        });

        it("inativar campanha de outra associacao → 404", async () => {
            repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ associacaoId: 999 })));

            await expect(servico.inativar(20, "1")).rejects.toMatchObject({ statusCode: 404 });
            expect(repo.inativar).not.toHaveBeenCalled();
        });

        it("reativa campanha inativa encerrada abrindo a edicao 2", async () => {
            repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ ativa: false, ...ENCERRADA })));
            repo.reativar.mockResolvedValue(
                resumoFake(
                    campanhaFake({
                        ativa: true,
                        edicao: 2,
                        dataInicio: new Date("2027-01-01T03:00:00.000Z"),
                        dataFim: new Date("2027-02-01T02:59:59.999Z"),
                        valorPorTicket: 20,
                    }),
                    { sorteioId: 51, totalTickets: 0 },
                ),
            );

            const resposta = await servico.reativar(20, "1", {
                dataInicio: "2027-01-01",
                dataFim: "2027-01-31",
                valorPorTicket: 20,
            });

            expect(repo.reativar).toHaveBeenCalledWith(
                1,
                { dataInicio: expect.any(Date), dataFim: expect.any(Date), valorPorTicket: 20 },
                expect.any(Date),
            );
            expect(resposta).toMatchObject({ ativa: true, edicao: 2, sorteioId: 51, totalTickets: 0, valorPorTicket: 20 });
        });

        it("reativa reutilizando o valor atual quando valorPorTicket e omitido", async () => {
            repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ ativa: false, ...ENCERRADA })));
            repo.reativar.mockResolvedValue(resumoFake(campanhaFake({ edicao: 2 })));

            await servico.reativar(20, "1", { dataInicio: "2027-01-01", dataFim: "2027-01-31" });

            expect(repo.reativar).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ valorPorTicket: undefined }),
                expect.any(Date),
            );
        });

        it("recusa reativar campanha ativa", async () => {
            await expect(
                servico.reativar(20, "1", { dataInicio: "2027-01-01", dataFim: "2027-01-31" }),
            ).rejects.toMatchObject({ statusCode: 409, detalhes: { codigo: "CAMPANHA_JA_ATIVA" } });
            expect(repo.reativar).not.toHaveBeenCalled();
        });

        it("recusa novo periodo comecando no passado", async () => {
            repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ ativa: false, ...ENCERRADA })));

            await expect(
                servico.reativar(20, "1", { dataInicio: "2026-08-15", dataFim: "2026-12-31" }),
            ).rejects.toMatchObject({ statusCode: 400 });
            expect(repo.reativar).not.toHaveBeenCalled();
        });

        it("recusa reativar sem datas", async () => {
            repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ ativa: false, ...ENCERRADA })));

            await expect(servico.reativar(20, "1", {} as never)).rejects.toMatchObject({ statusCode: 400 });
        });

        it.each(["SORTEIO_PENDENTE", "CAMPANHA_AINDA_VIGENTE", "OPERACAO_CONCORRENTE", "CAMPANHA_PERIODO_OCUPADO"])(
            "propaga 409 %s revalidado na transacao",
            async (codigo) => {
                repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ ativa: false, ...ENCERRADA })));
                repo.reativar.mockRejectedValue(new ErroAplicacao("conflito", 409, { codigo }));

                await expect(
                    servico.reativar(20, "1", { dataInicio: "2027-01-01", dataFim: "2027-01-31" }),
                ).rejects.toMatchObject({ statusCode: 409, detalhes: { codigo } });
            },
        );
    });

    describe("listagem, edicoes e exclusao", () => {
        it("lista campanhas com dados da edicao atual", async () => {
            vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
            repo.listarResumoPorAssociacaoId.mockResolvedValue([
                resumoFake(campanhaFake({ nome: "A", ...ENCERRADA }), { totalTickets: 4 }),
                resumoFake(campanhaFake({ id: 2, nome: "B", ...ENCERRADA }), {
                    totalTickets: 4,
                    situacaoResultado: "AGUARDANDO_ENTREGA",
                }),
                resumoFake(campanhaFake({ id: 3, nome: "C", ...ENCERRADA })),
            ]);

            const resultado = await servico.listar(20);

            expect(repo.listarResumoPorAssociacaoId).toHaveBeenCalledWith(3);
            expect(resultado.map((c) => [c.nome, c.periodoEncerrado, c.situacaoSorteio])).toEqual([
                ["A", true, "PRONTO_PARA_SORTEAR"],
                ["B", true, "AGUARDANDO_ENTREGA"],
                ["C", true, "SEM_TICKETS"],
            ]);
        });

        it("lista edicoes a partir dos snapshots e marca a atual", async () => {
            repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ edicao: 2 })));
            const edicoes: EdicaoCampanha[] = [
                {
                    edicao: 2,
                    dataInicio: new Date("2026-09-01T03:00:00.000Z"),
                    dataFim: new Date("2026-12-31T02:59:59.999Z"),
                    valorPorTicket: 20,
                    totalTickets: 3,
                    sorteioId: 51,
                    situacaoResultado: null,
                    dataSorteio: null,
                },
                {
                    edicao: 1,
                    ...ENCERRADA,
                    valorPorTicket: 10,
                    totalTickets: 8,
                    sorteioId: 50,
                    situacaoResultado: "ENTREGUE",
                    dataSorteio: new Date("2026-08-05T12:00:00.000Z"),
                },
            ];
            repo.listarEdicoes.mockResolvedValue(edicoes);

            const resposta = await servico.listarEdicoes(20, "1");

            expect(repo.listarEdicoes).toHaveBeenCalledWith(1);
            expect(resposta).toEqual([
                expect.objectContaining({
                    edicao: 2,
                    atual: true,
                    valorPorTicket: 20,
                    totalTickets: 3,
                    situacaoSorteio: "AGUARDANDO_ENCERRAMENTO",
                }),
                expect.objectContaining({
                    edicao: 1,
                    atual: false,
                    dataInicioCivil: "2026-07-01",
                    dataFimCivil: "2026-07-31",
                    valorPorTicket: 10,
                    sorteioId: 50,
                    periodoEncerrado: true,
                    situacaoSorteio: "ENTREGUE",
                }),
            ]);
        });

        it("edicoes de campanha de outra associacao → 404", async () => {
            repo.buscarResumo.mockResolvedValue(resumoFake(campanhaFake({ associacaoId: 999 })));

            await expect(servico.listarEdicoes(20, "1")).rejects.toMatchObject({ statusCode: 404 });
        });

        it("exclusao delega ao repositorio e propaga 409 CAMPANHA_COM_TICKETS", async () => {
            repo.deletar.mockRejectedValue(
                new ErroAplicacao("Campanha com tickets", 409, { codigo: "CAMPANHA_COM_TICKETS" }),
            );

            await expect(servico.deletar(20, "1")).rejects.toMatchObject({
                statusCode: 409,
                detalhes: { codigo: "CAMPANHA_COM_TICKETS" },
            });
            expect(repo.deletar).toHaveBeenCalledWith(1, false);
        });

        it("exclusao confirmada repassa forcar ao repositorio", async () => {
            repo.deletar.mockResolvedValue(undefined);

            await servico.deletar(20, "1", true);

            expect(repo.deletar).toHaveBeenCalledWith(1, true);
        });
    });
});
