import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
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

    it("bloqueia POST de catalogo global", async () => {
        await expect(servico.criar({ nome: "Alimentos" })).rejects.toMatchObject({
            statusCode: 403,
            message: "Escrita de catalogo global nao permitida",
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioMock.criar).not.toHaveBeenCalled();
    });

    it("bloqueia PUT de catalogo global", async () => {
        await expect(
            servico.atualizar("1", { nome: "Outro" }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioMock.atualizar).not.toHaveBeenCalled();
    });

    it("bloqueia DELETE de catalogo global", async () => {
        await expect(servico.deletar("1")).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioMock.deletar).not.toHaveBeenCalled();
    });

    it("busca inexistente retorna 404", async () => {
        repositorioMock.buscar.mockResolvedValue(null);
        await expect(servico.buscar("99")).rejects.toMatchObject({ statusCode: 404 });
    });
});
