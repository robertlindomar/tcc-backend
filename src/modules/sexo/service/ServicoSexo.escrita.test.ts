import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioSexo } from "../repository/RepositorioSexo";
import { ServicoSexo } from "./ServicoSexo";

describe("ServicoSexo escrita de catalogo", () => {
    let repositorioMock: {
        criar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
        listar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoSexo;

    beforeEach(() => {
        repositorioMock = {
            criar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
            listar: vi.fn(),
            buscar: vi.fn(),
        };
        servico = new ServicoSexo(repositorioMock as unknown as RepositorioSexo);
    });

    it("bloqueia POST", async () => {
        await expect(servico.criar({ nome: "Outro" })).rejects.toMatchObject({
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioMock.criar).not.toHaveBeenCalled();
    });

    it("bloqueia PUT", async () => {
        await expect(servico.atualizar("1", { nome: "X" })).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioMock.atualizar).not.toHaveBeenCalled();
    });

    it("bloqueia DELETE", async () => {
        await expect(servico.deletar("1")).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioMock.deletar).not.toHaveBeenCalled();
    });
});
