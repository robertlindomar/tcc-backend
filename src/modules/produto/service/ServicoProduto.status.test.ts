import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioCategoria } from "../../categoria/repository/RepositorioCategoria";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Produto } from "../model/Produto";
import { RepositorioProduto } from "../repository/RepositorioProduto";
import { ServicoProduto } from "./ServicoProduto";

describe("ServicoProduto por status do lojista", () => {
    let repositorioProdutoMock: {
        criar: ReturnType<typeof vi.fn>;
        listarPorLojistaId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoProduto;

    beforeEach(() => {
        repositorioProdutoMock = {
            criar: vi.fn(),
            listarPorLojistaId: vi.fn().mockResolvedValue([]),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        servico = new ServicoProduto(
            repositorioProdutoMock as unknown as RepositorioProduto,
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as RepositorioCategoria,
        );
    });

    it("PENDENTE nao cria produto", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );

        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10 }),
        ).rejects.toMatchObject({
            message: "Lojista precisa estar APROVADO para esta operacao",
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioProdutoMock.criar).not.toHaveBeenCalled();
    });

    it("REJEITADO nao cria produto", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(
            servico.criar(20, { nome: "Cafe", valor: 10 }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioProdutoMock.criar).not.toHaveBeenCalled();
    });

    it("APROVADO cria produto", async () => {
        const agora = new Date();
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioProdutoMock.criar.mockResolvedValue(
            new Produto({
                id: 1,
                nome: "Cafe",
                valor: 10,
                categoriaId: null,
                lojistaId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(20, { nome: "Cafe", valor: 10 });

        expect(resultado.lojistaId).toBe(5);
        expect(repositorioProdutoMock.criar).toHaveBeenCalledOnce();
    });

    it("REJEITADO nao lista, nao atualiza e nao deleta produto", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.listar(20)).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            servico.atualizar(20, "1", { nome: "Novo" }),
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(servico.deletar(20, "1")).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioProdutoMock.listarPorLojistaId).not.toHaveBeenCalled();
        expect(repositorioProdutoMock.atualizar).not.toHaveBeenCalled();
        expect(repositorioProdutoMock.deletar).not.toHaveBeenCalled();
    });

    it("PENDENTE nao lista produtos", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );

        await expect(servico.listar(20)).rejects.toMatchObject({ statusCode: 403 });
    });
});
