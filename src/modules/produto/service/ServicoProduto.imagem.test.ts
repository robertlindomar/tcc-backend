import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ServicoUploadImagem } from "../../../shared/upload/ServicoUploadImagem";
import { TAMANHO_MAXIMO_IMAGEM_BYTES } from "../../../shared/upload/regrasImagem";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioCategoria } from "../../categoria/repository/RepositorioCategoria";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Produto } from "../model/Produto";
import { RepositorioProduto } from "../repository/RepositorioProduto";
import { ServicoProduto } from "./ServicoProduto";

const jpegMinimo = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

function produtoFake(agora: Date, overrides: { lojistaId?: number; urlImagem?: string | null } = {}) {
    return new Produto({
        id: 1,
        nome: "Cafe",
        valor: 10,
        categoriaId: null,
        lojistaId: overrides.lojistaId ?? 5,
        urlImagem: overrides.urlImagem ?? null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoProduto imagem", () => {
    const agora = new Date();
    let repositorioProdutoMock: {
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let uploadMock: { gravar: ReturnType<typeof vi.fn>; remover: ReturnType<typeof vi.fn> };
    let servico: ServicoProduto;

    beforeEach(() => {
        repositorioProdutoMock = {
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
            criar: vi.fn(),
        };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        uploadMock = { gravar: vi.fn(), remover: vi.fn() };
        servico = new ServicoProduto(
            repositorioProdutoMock as unknown as RepositorioProduto,
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as RepositorioCategoria,
            uploadMock as unknown as ServicoUploadImagem,
        );
    });

    it("cria produto sem imagem", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioProdutoMock.criar.mockResolvedValue(produtoFake(agora));

        const resultado = await servico.criar(20, { nome: "Cafe", valor: 10 });
        expect(resultado.urlImagem).toBeNull();
    });

    it("grava imagem do proprio produto", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(produtoFake(agora));
        uploadMock.gravar.mockResolvedValue("/uploads/produtos/abc.jpg");
        repositorioProdutoMock.atualizar.mockResolvedValue(
            produtoFake(agora, { urlImagem: "/uploads/produtos/abc.jpg" }),
        );

        const resultado = await servico.definirImagem(20, "1", jpegMinimo);
        expect(uploadMock.gravar).toHaveBeenCalledWith("produtos", jpegMinimo);
        expect(resultado.urlImagem).toBe("/uploads/produtos/abc.jpg");
    });

    it("substitui e remove arquivo anterior", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(
            produtoFake(agora, { urlImagem: "/uploads/produtos/velho.jpg" }),
        );
        uploadMock.gravar.mockResolvedValue("/uploads/produtos/novo.jpg");
        repositorioProdutoMock.atualizar.mockResolvedValue(
            produtoFake(agora, { urlImagem: "/uploads/produtos/novo.jpg" }),
        );

        await servico.definirImagem(20, "1", jpegMinimo);
        expect(uploadMock.remover).toHaveBeenCalledWith("/uploads/produtos/velho.jpg");
    });

    it("nao altera imagem de produto de outro lojista", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(produtoFake(agora, { lojistaId: 9 }));

        await expect(servico.definirImagem(20, "1", jpegMinimo)).rejects.toMatchObject({
            statusCode: 404,
        });
        expect(uploadMock.gravar).not.toHaveBeenCalled();
    });

    it("PENDENTE nao envia imagem", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );
        await expect(servico.definirImagem(20, "1", jpegMinimo)).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it("exclui produto e tenta remover arquivo", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(
            produtoFake(agora, { urlImagem: "/uploads/produtos/x.jpg" }),
        );

        await servico.deletar(20, "1");
        expect(repositorioProdutoMock.deletar).toHaveBeenCalledWith(1);
        expect(uploadMock.remover).toHaveBeenCalledWith("/uploads/produtos/x.jpg");
    });
});

describe("ServicoUploadImagem", () => {
    it("rejeita formato invalido", async () => {
        const armazenamento = { gravar: vi.fn(), removerSeExistir: vi.fn() };
        const servico = new ServicoUploadImagem(armazenamento);
        await expect(servico.gravar("produtos", Buffer.from("nao-e-imagem-xxxx"))).rejects.toMatchObject({
            statusCode: 400,
        });
        expect(armazenamento.gravar).not.toHaveBeenCalled();
    });

    it("rejeita arquivo acima do limite", async () => {
        const armazenamento = { gravar: vi.fn(), removerSeExistir: vi.fn() };
        const servico = new ServicoUploadImagem(armazenamento);
        const grande = Buffer.alloc(TAMANHO_MAXIMO_IMAGEM_BYTES + 1, 0xff);
        grande[0] = 0xff;
        grande[1] = 0xd8;
        grande[2] = 0xff;
        await expect(servico.gravar("produtos", grande)).rejects.toMatchObject({
            statusCode: 400,
        });
    });
});
