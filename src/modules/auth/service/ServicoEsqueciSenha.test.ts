import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Usuario } from "../../usuario/model/Usuario";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Role } from "../enum/Role";
import { SENHA_PADRAO_TESTE, ServicoEsqueciSenha } from "./ServicoEsqueciSenha";

function criarUsuario(role: Role): Usuario {
    const agora = new Date();
    return new Usuario({
        id: 7,
        nome: "Consumidor Teste",
        email: "consumidor@teste.com",
        senha: "hash-antigo",
        role,
        ativo: true,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoEsqueciSenha", () => {
    let repositorioMock: {
        buscarPorEmail: ReturnType<typeof vi.fn>;
        atualizarSenha: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoEsqueciSenha;

    beforeEach(() => {
        process.env.REDEFINICAO_SENHA_TESTE = "true";
        repositorioMock = {
            buscarPorEmail: vi.fn(),
            atualizarSenha: vi.fn().mockResolvedValue(undefined),
        };
        servico = new ServicoEsqueciSenha(repositorioMock as unknown as RepositorioUsuario);
    });

    afterEach(() => {
        delete process.env.REDEFINICAO_SENHA_TESTE;
    });

    it("redefine a senha do consumidor para a senha padrao de teste", async () => {
        repositorioMock.buscarPorEmail.mockResolvedValue(criarUsuario(Role.CONSUMIDOR));

        const resultado = await servico.executar({ email: " consumidor@teste.com " });

        expect(repositorioMock.buscarPorEmail).toHaveBeenCalledWith("consumidor@teste.com");
        const [id, hash] = repositorioMock.atualizarSenha.mock.calls[0];
        expect(id).toBe(7);
        expect(await bcrypt.compare(SENHA_PADRAO_TESTE, hash)).toBe(true);
        expect(resultado.mensagem).toContain(SENHA_PADRAO_TESTE);
    });

    it("recusa com 403 quando a redefinicao de teste esta desligada", async () => {
        delete process.env.REDEFINICAO_SENHA_TESTE;

        await expect(servico.executar({ email: "consumidor@teste.com" })).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioMock.atualizarSenha).not.toHaveBeenCalled();
    });

    it("recusa com 400 quando o email nao e informado", async () => {
        await expect(servico.executar({ email: "  " })).rejects.toMatchObject({ statusCode: 400 });
    });

    it("recusa com 404 quando o email nao existe", async () => {
        repositorioMock.buscarPorEmail.mockResolvedValue(null);

        await expect(servico.executar({ email: "x@teste.com" })).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    it("nao redefine senha de contas que nao sao de consumidor", async () => {
        repositorioMock.buscarPorEmail.mockResolvedValue(criarUsuario(Role.LOJISTA));

        await expect(servico.executar({ email: "consumidor@teste.com" })).rejects.toMatchObject({
            statusCode: 404,
        });
        expect(repositorioMock.atualizarSenha).not.toHaveBeenCalled();
    });
});
