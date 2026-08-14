import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioCategoria } from "../../categoria/repository/RepositorioCategoria";
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

describe("ServicoProduto", () => {
    let repositorioProdutoMock: { criar: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let repositorioCategoriaMock: { buscar: ReturnType<typeof vi.fn> };
    let servico: ServicoProduto;

    beforeEach(() => {
        repositorioProdutoMock = {
            criar: vi.fn(),
        };
        repositorioLojistaMock = {
            buscarPorUsuarioId: vi.fn(),
        };
        repositorioCategoriaMock = {
            buscar: vi.fn(),
        };
        servico = new ServicoProduto(
            repositorioProdutoMock as unknown as RepositorioProduto,
            repositorioLojistaMock as unknown as RepositorioLojista,
            repositorioCategoriaMock as unknown as RepositorioCategoria,
        );
    });

    it("cria produto com lojista aprovado usando o lojistaId correto", async () => {
        const agora = new Date();
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake(StatusLojista.APROVADO, 5),
        );
        repositorioProdutoMock.criar.mockResolvedValue(
            new Produto({
                id: 1,
                nome: "Cafe",
                valor: 12.5,
                categoriaId: null,
                lojistaId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(20, {
            nome: " Cafe ",
            valor: 12.5,
        });

        expect(repositorioProdutoMock.criar).toHaveBeenCalledWith({
            nome: "Cafe",
            valor: 12.5,
            categoriaId: null,
            lojistaId: 5,
        });
        expect(resultado).toMatchObject({
            id: 1,
            nome: "Cafe",
            valor: 12.5,
            lojistaId: 5,
        });
    });

    it("rejeita categoriaId inexistente", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake(StatusLojista.APROVADO, 5),
        );
        repositorioCategoriaMock.buscar.mockResolvedValue(null);

        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10, categoriaId: 999 }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("propaga 403 quando lojista esta pendente", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake(StatusLojista.PENDENTE),
        );

        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10 }),
        ).rejects.toBeInstanceOf(ErroAplicacao);

        try {
            await servico.criar(20, { nome: "Cafe", valor: 10 });
        } catch (erro) {
            expect((erro as ErroAplicacao).statusCode).toBe(403);
        }
    });
});
