import { beforeEach, describe, expect, it, vi } from "vitest";
import { Associacao } from "../../modules/associacao/model/Associacao";
import { RepositorioAssociacao } from "../../modules/associacao/repository/RepositorioAssociacao";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { resolverAssociacaoLogada } from "./resolverAssociacaoLogada";

function associacaoFake(id = 3): Associacao {
    const agora = new Date();
    return new Associacao({
        id,
        nomeFantasia: "Associacao Teste",
        razaoSocial: "Associacao Teste LTDA",
        cnpj: "12.345.678/0001-90",
        inscricaoEstadual: null,
        usuarioId: 10,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("resolverAssociacaoLogada", () => {
    let repositorioMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        repositorioMock = {
            buscarPorUsuarioId: vi.fn(),
        };
    });

    it("retorna 404 quando associacao nao existe para o usuario", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(null);

        const promessa = resolverAssociacaoLogada(
            repositorioMock as unknown as RepositorioAssociacao,
            10,
        );

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Associacao nao encontrada para o usuario logado",
            statusCode: 404,
        });
        expect(repositorioMock.buscarPorUsuarioId).toHaveBeenCalledWith(10);
    });

    it("retorna associacaoId quando perfil existe", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(associacaoFake(42));

        const resultado = await resolverAssociacaoLogada(
            repositorioMock as unknown as RepositorioAssociacao,
            10,
        );

        expect(resultado).toEqual({ associacaoId: 42 });
    });
});
