import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { Campanha } from "../model/Campanha";
import { RepositorioCampanha } from "../repository/RepositorioCampanha";
import { ServicoCampanha } from "./ServicoCampanha";

function associacaoFake(id = 3): Associacao {
    const agora = new Date();
    return new Associacao({
        id,
        nomeFantasia: "Associacao Campanha",
        razaoSocial: "Associacao Campanha LTDA",
        cnpj: "11.222.333/0001-44",
        inscricaoEstadual: null,
        usuarioId: 20,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function campanhaFake(overrides: Partial<{
    id: number;
    nome: string;
    dataInicio: Date;
    dataFim: Date;
    valorPorTicket: number;
}> = {}): Campanha {
    const agora = new Date("2026-09-01T12:00:00.000Z");
    return new Campanha({
        id: overrides.id ?? 1,
        nome: overrides.nome ?? "Campanha Verao",
        descricao: "Desc",
        qrcode: "qr-1",
        dataInicio: overrides.dataInicio ?? new Date("2026-09-01T03:00:00.000Z"),
        dataFim: overrides.dataFim ?? new Date("2026-12-31T02:59:59.999Z"),
        valorPorTicket: overrides.valorPorTicket ?? 10,
        associacaoId: 3,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoCampanha", () => {
    let repositorioCampanhaMock: {
        criar: ReturnType<typeof vi.fn>;
        listarPorAssociacaoId: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoCampanha;

    beforeEach(() => {
        repositorioCampanhaMock = {
            criar: vi.fn(),
            listarPorAssociacaoId: vi.fn(),
            atualizar: vi.fn(),
            buscar: vi.fn(),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(associacaoFake(3)),
        };
        servico = new ServicoCampanha(
            repositorioCampanhaMock as unknown as RepositorioCampanha,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
        );
    });

    it("cria campanha com associacaoId do resolver e vigencia", async () => {
        repositorioCampanhaMock.criar.mockResolvedValue(campanhaFake());

        const resultado = await servico.criar(20, {
            nome: " Campanha Verao ",
            descricao: "Desc",
            qrcode: "qr-1",
            dataInicio: "2026-09-01",
            dataFim: "2026-12-31",
            valorPorTicket: 10,
        });

        expect(repositorioAssociacaoMock.buscarPorUsuarioId).toHaveBeenCalledWith(20);
        expect(repositorioCampanhaMock.criar).toHaveBeenCalledWith(
            expect.objectContaining({
                nome: "Campanha Verao",
                descricao: "Desc",
                qrcode: "qr-1",
                associacaoId: 3,
                valorPorTicket: 10,
            }),
        );
        expect(resultado).toMatchObject({
            id: 1,
            nome: "Campanha Verao",
            associacaoId: 3,
            valorPorTicket: 10,
            dataInicioCivil: expect.any(String),
            dataFimCivil: expect.any(String),
        });
    });

    it("recusa valorPorTicket <= 0", async () => {
        await expect(
            servico.criar(20, {
                nome: "X",
                dataInicio: "2026-09-01",
                dataFim: "2026-12-31",
                valorPorTicket: 0,
            }),
        ).rejects.toMatchObject({
            message: "Valor por ticket deve ser maior que zero",
            statusCode: 400,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioCampanhaMock.criar).not.toHaveBeenCalled();
    });

    it("recusa dataFim anterior a dataInicio", async () => {
        await expect(
            servico.criar(20, {
                nome: "X",
                dataInicio: "2026-12-31",
                dataFim: "2026-09-01",
                valorPorTicket: 10,
            }),
        ).rejects.toMatchObject({
            message: "Data de fim deve ser maior ou igual a data de inicio",
            statusCode: 400,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioCampanhaMock.criar).not.toHaveBeenCalled();
    });

    it("lista apenas campanhas da associacao logada", async () => {
        repositorioCampanhaMock.listarPorAssociacaoId.mockResolvedValue([
            campanhaFake({ nome: "Campanha A" }),
        ]);

        const resultado = await servico.listar(20);

        expect(repositorioCampanhaMock.listarPorAssociacaoId).toHaveBeenCalledWith(3);
        expect(resultado).toHaveLength(1);
        expect(resultado[0]).toMatchObject({
            id: 1,
            nome: "Campanha A",
            associacaoId: 3,
            valorPorTicket: 10,
        });
    });
});
