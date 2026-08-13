import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../generated/prisma/enums";
import { Lojista } from "../../modules/lojista/model/Lojista";
import { RepositorioLojista } from "../../modules/lojista/repository/RepositorioLojista";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { resolverLojistaAprovado } from "./resolverLojistaAprovado";

function lojistaFake(status: StatusLojista, id = 7): Lojista {
    const agora = new Date();
    return new Lojista({
        id,
        nomeFantasia: "Loja Teste",
        razaoSocial: "Loja Teste LTDA",
        cnpj: "12.345.678/0001-90",
        inscricaoEstadual: null,
        status,
        usuarioId: 10,
        associacaoId: 1,
        enderecoId: null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("resolverLojistaAprovado", () => {
    let repositorioMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        repositorioMock = {
            buscarPorUsuarioId: vi.fn(),
        };
    });

    it("retorna 404 quando lojista nao existe para o usuario", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(null);

        const promessa = resolverLojistaAprovado(
            repositorioMock as unknown as RepositorioLojista,
            10,
        );

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Lojista nao encontrado para o usuario logado",
            statusCode: 404,
        });
        expect(repositorioMock.buscarPorUsuarioId).toHaveBeenCalledWith(10);
    });

    it("retorna 403 quando lojista esta PENDENTE", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake(StatusLojista.PENDENTE),
        );

        const promessa = resolverLojistaAprovado(
            repositorioMock as unknown as RepositorioLojista,
            10,
        );

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Lojista precisa estar APROVADO para esta operacao",
            statusCode: 403,
        });
    });

    it("retorna 403 quando lojista esta REJEITADO", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake(StatusLojista.REJEITADO),
        );

        const promessa = resolverLojistaAprovado(
            repositorioMock as unknown as RepositorioLojista,
            10,
        );

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Lojista precisa estar APROVADO para esta operacao",
            statusCode: 403,
        });
    });

    it("retorna lojistaId quando lojista esta APROVADO", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake(StatusLojista.APROVADO, 42),
        );

        const resultado = await resolverLojistaAprovado(
            repositorioMock as unknown as RepositorioLojista,
            10,
        );

        expect(resultado).toEqual({ lojistaId: 42 });
    });
});
