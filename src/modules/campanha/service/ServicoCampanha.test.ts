import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("ServicoCampanha", () => {
    let repositorioCampanhaMock: {
        criar: ReturnType<typeof vi.fn>;
        listarPorAssociacaoId: ReturnType<typeof vi.fn>;
    };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoCampanha;

    beforeEach(() => {
        repositorioCampanhaMock = {
            criar: vi.fn(),
            listarPorAssociacaoId: vi.fn(),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(associacaoFake(3)),
        };
        servico = new ServicoCampanha(
            repositorioCampanhaMock as unknown as RepositorioCampanha,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
        );
    });

    it("cria campanha com associacaoId do resolver", async () => {
        const agora = new Date();
        repositorioCampanhaMock.criar.mockResolvedValue(
            new Campanha({
                id: 1,
                nome: "Campanha Verao",
                descricao: "Desc",
                qrcode: "qr-1",
                associacaoId: 3,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(20, {
            nome: " Campanha Verao ",
            descricao: "Desc",
            qrcode: "qr-1",
        });

        expect(repositorioAssociacaoMock.buscarPorUsuarioId).toHaveBeenCalledWith(20);
        expect(repositorioCampanhaMock.criar).toHaveBeenCalledWith({
            nome: "Campanha Verao",
            descricao: "Desc",
            qrcode: "qr-1",
            associacaoId: 3,
        });
        expect(resultado).toMatchObject({
            id: 1,
            nome: "Campanha Verao",
            associacaoId: 3,
        });
    });

    it("lista apenas campanhas da associacao logada", async () => {
        const agora = new Date();
        repositorioCampanhaMock.listarPorAssociacaoId.mockResolvedValue([
            new Campanha({
                id: 1,
                nome: "Campanha A",
                descricao: null,
                qrcode: null,
                associacaoId: 3,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        ]);

        const resultado = await servico.listar(20);

        expect(repositorioCampanhaMock.listarPorAssociacaoId).toHaveBeenCalledWith(3);
        expect(resultado).toHaveLength(1);
        expect(resultado[0]).toMatchObject({ id: 1, nome: "Campanha A", associacaoId: 3 });
    });
});
