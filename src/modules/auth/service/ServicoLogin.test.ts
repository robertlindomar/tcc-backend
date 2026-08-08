import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Usuario } from "../../usuario/model/Usuario";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Role } from "../enum/Role";
import { ServicoLogin } from "./ServicoLogin";

const SECRET_TESTE = "segredo-teste-vitest";

describe("ServicoLogin", () => {
    let repositorioMock: { buscarPorEmail: ReturnType<typeof vi.fn> };
    let servico: ServicoLogin;

    beforeEach(() => {
        process.env.SECRET_KEY = SECRET_TESTE;
        repositorioMock = {
            buscarPorEmail: vi.fn(),
        };
        servico = new ServicoLogin(repositorioMock as unknown as RepositorioUsuario);
    });

    it("retorna token e usuario quando credenciais sao validas", async () => {
        const senhaPlana = "senha-correta";
        const senhaHash = await bcrypt.hash(senhaPlana, 8);
        const agora = new Date();

        repositorioMock.buscarPorEmail.mockResolvedValue(
            new Usuario({
                id: 10,
                nome: "Lojista Teste",
                email: "lojista@teste.com",
                senha: senhaHash,
                role: Role.LOJISTA,
                ativo: true,
                createdAt: agora,
                updatedAt: agora,
            }),
        );

        const resultado = await servico.executar({
            email: "lojista@teste.com",
            senha: senhaPlana,
        });

        expect(resultado.usuario).toMatchObject({
            id: 10,
            nome: "Lojista Teste",
            email: "lojista@teste.com",
            role: Role.LOJISTA,
            ativo: true,
        });
        expect(resultado.token).toBeTruthy();

        const decoded = jwt.verify(resultado.token, SECRET_TESTE) as unknown as {
            sub: number;
            role: Role;
        };
        expect(decoded.sub).toBe(10);
        expect(decoded.role).toBe(Role.LOJISTA);
    });

    it("rejeita com 401 quando a senha esta incorreta", async () => {
        const senhaHash = await bcrypt.hash("senha-correta", 8);
        const agora = new Date();

        repositorioMock.buscarPorEmail.mockResolvedValue(
            new Usuario({
                id: 10,
                nome: "Lojista Teste",
                email: "lojista@teste.com",
                senha: senhaHash,
                role: Role.LOJISTA,
                ativo: true,
                createdAt: agora,
                updatedAt: agora,
            }),
        );

        const promessa = servico.executar({
            email: "lojista@teste.com",
            senha: "senha-errada",
        });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Credenciais invalidas",
            statusCode: 401,
        });
    });
});
