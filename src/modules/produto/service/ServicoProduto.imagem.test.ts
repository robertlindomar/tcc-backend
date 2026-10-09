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
const pngMinimo = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);
const webpMinimo = Buffer.from("RIFF....WEBP", "ascii");

function produtoFake(
    agora: Date,
    overrides: { lojistaId?: number; urlImagem?: string | null } = {},
) {
    return new Produto({
        id: 1,
        nome: "Cafe",
        valor: 10,
        categoriaId: null,
        lojistaId: overrides.lojistaId ?? 5,
        urlImagem: overrides.urlImagem === undefined ? "/uploads/produtos/abc.jpg" : overrides.urlImagem,
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
        listarPorLojistaId: ReturnType<typeof vi.fn>;
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
            listarPorLojistaId: vi.fn(),
        };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        uploadMock = { gravar: vi.fn(), remover: vi.fn() };
        servico = new ServicoProduto(
            repositorioProdutoMock as unknown as RepositorioProduto,
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as RepositorioCategoria,
            uploadMock as unknown as ServicoUploadImagem,
        );
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
    });

    it("bloqueia criacao sem imagem", async () => {
        await expect(servico.criar(20, { nome: "Cafe", valor: 10 }, Buffer.alloc(0))).rejects.toMatchObject({
            statusCode: 400,
            message: "Imagem do produto e obrigatoria",
        });
        expect(repositorioProdutoMock.criar).not.toHaveBeenCalled();
        expect(uploadMock.gravar).not.toHaveBeenCalled();
    });

    it("cria produto com JPEG", async () => {
        uploadMock.gravar.mockResolvedValue("/uploads/produtos/a.jpg");
        repositorioProdutoMock.criar.mockResolvedValue(
            produtoFake(agora, { urlImagem: "/uploads/produtos/a.jpg" }),
        );

        const resultado = await servico.criar(20, { nome: "Cafe", valor: 10 }, jpegMinimo);

        expect(uploadMock.gravar).toHaveBeenCalledWith("produtos", jpegMinimo);
        expect(repositorioProdutoMock.criar).toHaveBeenCalledWith(
            expect.objectContaining({ urlImagem: "/uploads/produtos/a.jpg", lojistaId: 5 }),
        );
        expect(resultado.urlImagem).toBe("/uploads/produtos/a.jpg");
    });

    it("cria produto com PNG", async () => {
        uploadMock.gravar.mockResolvedValue("/uploads/produtos/a.png");
        repositorioProdutoMock.criar.mockResolvedValue(
            produtoFake(agora, { urlImagem: "/uploads/produtos/a.png" }),
        );

        const resultado = await servico.criar(20, { nome: "Cafe", valor: 10 }, pngMinimo);
        expect(uploadMock.gravar).toHaveBeenCalledWith("produtos", pngMinimo);
        expect(resultado.urlImagem).toBe("/uploads/produtos/a.png");
    });

    it("cria produto com WebP", async () => {
        uploadMock.gravar.mockResolvedValue("/uploads/produtos/a.webp");
        repositorioProdutoMock.criar.mockResolvedValue(
            produtoFake(agora, { urlImagem: "/uploads/produtos/a.webp" }),
        );

        const resultado = await servico.criar(20, { nome: "Cafe", valor: 10 }, webpMinimo);
        expect(uploadMock.gravar).toHaveBeenCalledWith("produtos", webpMinimo);
        expect(resultado.urlImagem).toBe("/uploads/produtos/a.webp");
    });

    it("formato invalido nao persiste produto", async () => {
        uploadMock.gravar.mockRejectedValue({
            statusCode: 400,
            message: "Formato de imagem nao permitido",
        });

        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10 }, Buffer.from("nao-e-imagem-xxxx")),
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(repositorioProdutoMock.criar).not.toHaveBeenCalled();
    });

    it("se o persistir falhar depois do upload, remove o arquivo", async () => {
        uploadMock.gravar.mockResolvedValue("/uploads/produtos/orfao.jpg");
        repositorioProdutoMock.criar.mockRejectedValue(new Error("falha db"));

        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10 }, jpegMinimo),
        ).rejects.toThrow("falha db");
        expect(uploadMock.remover).toHaveBeenCalledWith("/uploads/produtos/orfao.jpg");
    });

    it("lista produto legado sem imagem", async () => {
        repositorioProdutoMock.listarPorLojistaId.mockResolvedValue([
            produtoFake(agora, { urlImagem: null }),
        ]);

        const lista = await servico.listar(20);
        expect(lista).toHaveLength(1);
        expect(lista[0].urlImagem).toBeNull();
    });

    it("nao atualiza dados de legado sem imagem", async () => {
        repositorioProdutoMock.buscar.mockResolvedValue(produtoFake(agora, { urlImagem: null }));

        await expect(servico.atualizar(20, "1", { nome: "Novo" })).rejects.toMatchObject({
            statusCode: 400,
            message: "Imagem do produto e obrigatoria",
        });
        expect(repositorioProdutoMock.atualizar).not.toHaveBeenCalled();
    });

    it("grava imagem do proprio produto", async () => {
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

    it("REJEITADO nao cria produto", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );
        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10 }, jpegMinimo),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioProdutoMock.criar).not.toHaveBeenCalled();
    });

    it("exclui produto e tenta remover arquivo", async () => {
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
