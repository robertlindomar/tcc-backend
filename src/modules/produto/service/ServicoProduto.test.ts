import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioCategoria } from "../../categoria/repository/RepositorioCategoria";
import { Lojista } from "../../lojista/model/Lojista";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Produto } from "../model/Produto";
import { RepositorioProduto } from "../repository/RepositorioProduto";
import { ServicoProduto } from "./ServicoProduto";

const jpegMinimo = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

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
    let uploadMock: { gravar: ReturnType<typeof vi.fn>; remover: ReturnType<typeof vi.fn> };
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
        uploadMock = {
            gravar: vi.fn().mockResolvedValue("/uploads/produtos/a.jpg"),
            remover: vi.fn(),
        };
        servico = new ServicoProduto(
            repositorioProdutoMock as unknown as RepositorioProduto,
            repositorioLojistaMock as unknown as RepositorioLojista,
            repositorioCategoriaMock as unknown as RepositorioCategoria,
            uploadMock as never,
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
                urlImagem: "/uploads/produtos/a.jpg",
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(
            20,
            {
                nome: " Cafe ",
                valor: 12.5,
            },
            jpegMinimo,
        );

        expect(repositorioProdutoMock.criar).toHaveBeenCalledWith({
            nome: "Cafe",
            valor: 12.5,
            categoriaId: null,
            lojistaId: 5,
            urlImagem: "/uploads/produtos/a.jpg",
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
            servico.criar(20, { nome: "Cafe", valor: 10, categoriaId: 999 }, jpegMinimo),
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("rejeita categoria de outro lojista", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake(StatusLojista.APROVADO, 5),
        );
        repositorioCategoriaMock.buscar.mockResolvedValue({
            id: 9,
            nome: "Alimentos",
            lojistaId: 8,
        });

        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10, categoriaId: 9 }, jpegMinimo),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(repositorioProdutoMock.criar).not.toHaveBeenCalled();
    });

    it("propaga 403 quando lojista esta pendente", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake(StatusLojista.PENDENTE),
        );

        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10 }, jpegMinimo),
        ).rejects.toBeInstanceOf(ErroAplicacao);

        try {
            await servico.criar(20, { nome: "Cafe", valor: 10 }, jpegMinimo);
        } catch (erro) {
            expect((erro as ErroAplicacao).statusCode).toBe(403);
        }
    });
});
