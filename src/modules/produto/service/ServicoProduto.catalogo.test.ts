import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Lojista } from "../../lojista/model/Lojista";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Produto } from "../model/Produto";
import { RepositorioProduto } from "../repository/RepositorioProduto";
import { ServicoProduto } from "./ServicoProduto";

function lojistaFake(status: StatusLojista, id = 5): Lojista {
    const agora = new Date();
    return new Lojista({
        id,
        nomeFantasia: "Loja Produto",
        razaoSocial: "Loja Produto LTDA",
        cnpj: "11.222.333/0001-44",
        inscricaoEstadual: null,
        status,
        usuarioId: 20,
        associacaoId: 1,
        enderecoId: null,
        justificativaRejeicao: null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function produtoFake(overrides: Partial<{ id: number; urlImagem: string | null }> = {}): Produto {
    const agora = new Date();
    return new Produto({
        id: overrides.id ?? 1,
        nome: "Cafe",
        valor: 12.5,
        categoriaId: null,
        lojistaId: 5,
        urlImagem: overrides.urlImagem === undefined ? "/uploads/produtos/a.jpg" : overrides.urlImagem,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoProduto.listarCatalogo", () => {
    let repositorioProdutoMock: { listarPorLojistaId: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: { buscar: ReturnType<typeof vi.fn> };
    let servico: ServicoProduto;

    beforeEach(() => {
        repositorioProdutoMock = { listarPorLojistaId: vi.fn() };
        repositorioLojistaMock = { buscar: vi.fn() };
        servico = new ServicoProduto(
            repositorioProdutoMock as unknown as RepositorioProduto,
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as never,
            {} as never,
        );
    });

    it("lista produtos com foto da loja APROVADO", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaFake(StatusLojista.APROVADO, 5));
        repositorioProdutoMock.listarPorLojistaId.mockResolvedValue([
            produtoFake({ id: 1 }),
            produtoFake({ id: 2, urlImagem: null }),
        ]);

        const lista = await servico.listarCatalogo("5");

        expect(repositorioProdutoMock.listarPorLojistaId).toHaveBeenCalledWith(5);
        expect(lista).toHaveLength(1);
        expect(lista[0]).toMatchObject({ id: 1, nome: "Cafe", valor: 12.5, lojistaId: 5 });
    });

    it("retorna 404 para loja pendente ou inexistente", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaFake(StatusLojista.PENDENTE, 5));

        await expect(servico.listarCatalogo("5")).rejects.toMatchObject({
            statusCode: 404,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioProdutoMock.listarPorLojistaId).not.toHaveBeenCalled();
    });

    it("rejeita lojistaId invalido", async () => {
        await expect(servico.listarCatalogo("abc")).rejects.toMatchObject({ statusCode: 400 });
    });
});
