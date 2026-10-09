import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { Usuario } from "../model/Usuario";
import { RepositorioUsuario } from "../repository/RepositorioUsuario";
import { ServicoUsuario } from "./ServicoUsuario";

describe("ServicoUsuario.criar (cadastro publico web+mobile)", () => {
    let repositorioMock: {
        buscarPorEmail: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoUsuario;

    beforeEach(() => {
        repositorioMock = {
            buscarPorEmail: vi.fn().mockResolvedValue(null),
            criar: vi.fn(),
        };
        servico = new ServicoUsuario(repositorioMock as unknown as RepositorioUsuario);
    });

    it("rejeita ASSOCIACAO (nao ha cadastro publico de associacao)", async () => {
        await expect(
            servico.criar({
                nome: "Assoc",
                email: "assoc@teste.com",
                senha: "senha123",
                role: Role.ASSOCIACAO,
            }),
        ).rejects.toMatchObject({
            message: "Cadastro de associacao nao permitido pela API publica",
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);

        expect(repositorioMock.criar).not.toHaveBeenCalled();
    });

    it("permite LOJISTA (web /cadastro)", async () => {
        const agora = new Date();
        repositorioMock.criar.mockImplementation(async (usuario: Usuario) =>
            new Usuario({
                id: 1,
                nome: usuario.nome,
                email: usuario.email,
                senha: usuario.senha,
                role: usuario.role,
                ativo: true,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar({
            nome: "Loja",
            email: "loja@teste.com",
            senha: "senha123",
            role: Role.LOJISTA,
        });

        expect(resultado.role).toBe(Role.LOJISTA);
        expect(repositorioMock.criar).toHaveBeenCalledOnce();
    });

    it("permite CONSUMIDOR (mesma API para o app mobile)", async () => {
        const agora = new Date();
        repositorioMock.criar.mockImplementation(async (usuario: Usuario) =>
            new Usuario({
                id: 2,
                nome: usuario.nome,
                email: usuario.email,
                senha: usuario.senha,
                role: usuario.role,
                ativo: true,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar({
            nome: "Consumidor",
            email: "consumidor@teste.com",
            senha: "senha123",
            role: Role.CONSUMIDOR,
        });

        expect(resultado.role).toBe(Role.CONSUMIDOR);
        expect(repositorioMock.criar).toHaveBeenCalledOnce();
    });

    it("rejeita role invalida", async () => {
        await expect(
            servico.criar({
                nome: "X",
                email: "x@teste.com",
                senha: "senha123",
                role: "ADMIN",
            }),
        ).rejects.toBeInstanceOf(ErroAplicacao);

        expect(repositorioMock.criar).not.toHaveBeenCalled();
    });
});
