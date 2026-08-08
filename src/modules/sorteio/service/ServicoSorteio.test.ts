import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { Campanha } from "../../campanha/model/Campanha";
import { RepositorioCampanha } from "../../campanha/repository/RepositorioCampanha";
import { Sorteio } from "../model/Sorteio";
import { RepositorioSorteio } from "../repository/RepositorioSorteio";
import { ServicoSorteio } from "./ServicoSorteio";

function associacaoFake(id = 3): Associacao {
    const agora = new Date();
    return new Associacao({
        id,
        nomeFantasia: "Associacao Sorteio",
        razaoSocial: "Associacao Sorteio LTDA",
        cnpj: "55.666.777/0001-88",
        inscricaoEstadual: null,
        usuarioId: 20,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function campanhaFake(associacaoId: number, id = 10): Campanha {
    const agora = new Date();
    return new Campanha({
        id,
        nome: "Campanha Base",
        descricao: null,
        qrcode: null,
        associacaoId,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoSorteio", () => {
    let repositorioSorteioMock: { criar: ReturnType<typeof vi.fn> };
    let repositorioCampanhaMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoSorteio;

    beforeEach(() => {
        repositorioSorteioMock = {
            criar: vi.fn(),
        };
        repositorioCampanhaMock = {
            buscar: vi.fn(),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(associacaoFake(3)),
        };
        servico = new ServicoSorteio(
            repositorioSorteioMock as unknown as RepositorioSorteio,
            repositorioCampanhaMock as unknown as RepositorioCampanha,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
        );
    });

    it("cria sorteio quando campanha pertence a associacao logada", async () => {
        const agora = new Date();
        repositorioCampanhaMock.buscar.mockResolvedValue(campanhaFake(3, 10));
        repositorioSorteioMock.criar.mockResolvedValue(
            new Sorteio({
                id: 1,
                qrcode: "qr-sorteio",
                campanhaId: 10,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(20, {
            campanhaId: 10,
            qrcode: "qr-sorteio",
        });

        expect(repositorioCampanhaMock.buscar).toHaveBeenCalledWith(10);
        expect(repositorioSorteioMock.criar).toHaveBeenCalledWith({
            campanhaId: 10,
            qrcode: "qr-sorteio",
        });
        expect(resultado).toMatchObject({
            id: 1,
            campanhaId: 10,
            qrcode: "qr-sorteio",
        });
    });

    it("retorna 404 quando campanha pertence a outra associacao", async () => {
        repositorioCampanhaMock.buscar.mockResolvedValue(campanhaFake(999, 10));

        const promessa = servico.criar(20, {
            campanhaId: 10,
            qrcode: null,
        });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Campanha nao encontrada",
            statusCode: 404,
        });
        expect(repositorioSorteioMock.criar).not.toHaveBeenCalled();
    });
});
