import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Categoria } from "../model/Categoria";
import { RepositorioCategoria } from "../repository/RepositorioCategoria";
import { ServicoCategoria } from "./ServicoCategoria";

describe("ServicoCategoria", () => {
    let repositorioMock: {
        criar: ReturnType<typeof vi.fn>;
        listar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoCategoria;

    beforeEach(() => {
        repositorioMock = {
            criar: vi.fn(),
            listar: vi.fn(),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
        servico = new ServicoCategoria(
            repositorioMock as unknown as RepositorioCategoria,
        );
    });

    it("cria categoria com nome trimado", async () => {
        const agora = new Date();
        repositorioMock.criar.mockResolvedValue(
            new Categoria({
                id: 1,
                nome: "Alimentos",
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar({ nome: "  Alimentos  " });

        expect(repositorioMock.criar).toHaveBeenCalled();
        expect(resultado).toMatchObject({ id: 1, nome: "Alimentos" });
    });

    it("rejeita nome vazio", async () => {
        await expect(servico.criar({ nome: "   " })).rejects.toBeInstanceOf(
            ErroAplicacao,
        );
    });

    it("busca inexistente retorna 404", async () => {
        repositorioMock.buscar.mockResolvedValue(null);
        await expect(servico.buscar("99")).rejects.toMatchObject({ statusCode: 404 });
    });
});
