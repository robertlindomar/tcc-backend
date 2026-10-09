import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Categoria } from "../model/Categoria";
import { RepositorioCategoria } from "../repository/RepositorioCategoria";
import { ServicoCategoria } from "./ServicoCategoria";

function categoriaFake(overrides: {
    id?: number;
    nome?: string;
    lojistaId: number;
}): Categoria {
    const agora = new Date();
    return new Categoria({
        id: overrides.id ?? 1,
        nome: overrides.nome ?? "Alimentos",
        lojistaId: overrides.lojistaId,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoCategoria", () => {
    let repositorioCategoriaMock: {
        criar: ReturnType<typeof vi.fn>;
        listarPorLojistaId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoCategoria;

    beforeEach(() => {
        repositorioCategoriaMock = {
            criar: vi.fn(),
            listarPorLojistaId: vi.fn().mockResolvedValue([]),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        servico = new ServicoCategoria(
            repositorioCategoriaMock as unknown as RepositorioCategoria,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    it("PENDENTE nao cria categoria", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );

        await expect(servico.criar(20, { nome: "Alimentos" })).rejects.toMatchObject({
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioCategoriaMock.criar).not.toHaveBeenCalled();
    });

    it("REJEITADO nao lista categorias", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.listar(20)).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioCategoriaMock.listarPorLojistaId).not.toHaveBeenCalled();
    });

    it("APROVADO cria categoria da propria loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioCategoriaMock.criar.mockResolvedValue(categoriaFake({ lojistaId: 5 }));

        const resultado = await servico.criar(20, { nome: " Alimentos " });

        expect(repositorioCategoriaMock.criar).toHaveBeenCalledWith({
            nome: "Alimentos",
            lojistaId: 5,
        });
        expect(resultado.lojistaId).toBe(5);
    });

    it("lista apenas categorias do lojista autenticado", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioCategoriaMock.listarPorLojistaId.mockResolvedValue([
            categoriaFake({ id: 1, lojistaId: 5 }),
        ]);

        const lista = await servico.listar(20);

        expect(repositorioCategoriaMock.listarPorLojistaId).toHaveBeenCalledWith(5);
        expect(lista).toHaveLength(1);
        expect(lista[0].lojistaId).toBe(5);
    });

    it("nao le categoria de outro lojista", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioCategoriaMock.buscar.mockResolvedValue(
            categoriaFake({ id: 9, lojistaId: 8 }),
        );

        await expect(servico.buscar(20, "9")).rejects.toMatchObject({
            statusCode: 404,
        });
        expect(repositorioCategoriaMock.atualizar).not.toHaveBeenCalled();
    });

    it("nao atualiza categoria de outro lojista", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioCategoriaMock.buscar.mockResolvedValue(
            categoriaFake({ id: 9, nome: "Bebidas", lojistaId: 8 }),
        );

        await expect(
            servico.atualizar(20, "9", { nome: "Hack" }),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(repositorioCategoriaMock.atualizar).not.toHaveBeenCalled();
    });

    it("nao exclui categoria de outro lojista", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioCategoriaMock.buscar.mockResolvedValue(
            categoriaFake({ id: 9, lojistaId: 8 }),
        );

        await expect(servico.deletar(20, "9")).rejects.toMatchObject({
            statusCode: 404,
        });
        expect(repositorioCategoriaMock.deletar).not.toHaveBeenCalled();
    });

    it("busca inexistente retorna 404", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioCategoriaMock.buscar.mockResolvedValue(null);

        await expect(servico.buscar(20, "99")).rejects.toMatchObject({
            statusCode: 404,
        });
    });
});
