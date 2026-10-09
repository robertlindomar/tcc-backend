import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { Usuario } from "../model/Usuario";
import { RepositorioUsuario } from "../repository/RepositorioUsuario";
import { ServicoUsuario } from "./ServicoUsuario";

function usuarioFake(id: number, role = Role.CONSUMIDOR): Usuario {
    const agora = new Date();
    return new Usuario({
        id,
        nome: `Usuario ${id}`,
        email: `usuario${id}@teste.com`,
        senha: "hash",
        role,
        ativo: true,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoUsuario ownership", () => {
    let repositorioMock: {
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
        listar: ReturnType<typeof vi.fn>;
        buscarPorEmail: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoUsuario;

    beforeEach(() => {
        repositorioMock = {
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
            listar: vi.fn(),
            buscarPorEmail: vi.fn(),
            criar: vi.fn(),
        };
        servico = new ServicoUsuario(repositorioMock as unknown as RepositorioUsuario);
    });

    it("usuario A consulta o proprio usuario", async () => {
        repositorioMock.buscar.mockResolvedValue(usuarioFake(10));

        const resultado = await servico.buscar("10", 10);

        expect(resultado.id).toBe(10);
        expect(repositorioMock.buscar).toHaveBeenCalledWith(10);
    });

    it("usuario A nao consulta usuario B", async () => {
        await expect(servico.buscar("11", 10)).rejects.toMatchObject({
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioMock.buscar).not.toHaveBeenCalled();
    });

    it("usuario A nao altera usuario B", async () => {
        await expect(
            servico.atualizar("11", 10, { nome: "Hack", email: "hack@teste.com" }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioMock.atualizar).not.toHaveBeenCalled();
    });

    it("usuario A nao exclui usuario B", async () => {
        await expect(servico.deletar("11", 10)).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioMock.deletar).not.toHaveBeenCalled();
    });

    it("listar todos os usuarios e negado", async () => {
        await expect(servico.listar()).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioMock.listar).not.toHaveBeenCalled();
    });

    it("POST /usuario via HTTP e negado (cadastro so em /auth/cadastro)", async () => {
        await expect(servico.criarViaHttp()).rejects.toMatchObject({
            statusCode: 403,
            message: "Cadastro publico deve usar POST /auth/cadastro",
        });
        expect(repositorioMock.criar).not.toHaveBeenCalled();
    });
});
