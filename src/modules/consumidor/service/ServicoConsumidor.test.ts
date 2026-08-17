import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { Endereco } from "../../endereco/model/Endereco";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { Usuario } from "../../usuario/model/Usuario";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Consumidor } from "../model/Consumidor";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";
import { ServicoConsumidor } from "./ServicoConsumidor";

describe("ServicoConsumidor", () => {
    let repositorioConsumidorMock: {
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        buscarPorCpf: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
    };
    let repositorioUsuarioMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioEnderecoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let repositorioSexoMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: { buscar: ReturnType<typeof vi.fn> };
    let servico: ServicoConsumidor;

    beforeEach(() => {
        repositorioConsumidorMock = {
            buscarPorUsuarioId: vi.fn(),
            buscarPorCpf: vi.fn(),
            criar: vi.fn(),
        };
        repositorioUsuarioMock = {
            buscar: vi.fn(),
        };
        repositorioEnderecoMock = {
            buscarPorUsuarioId: vi.fn(),
        };
        repositorioSexoMock = {
            buscar: vi.fn(),
        };
        repositorioLojistaMock = {
            buscar: vi.fn(),
        };
        servico = new ServicoConsumidor(
            repositorioConsumidorMock as unknown as RepositorioConsumidor,
            repositorioUsuarioMock as unknown as RepositorioUsuario,
            repositorioEnderecoMock as unknown as RepositorioEndereco,
            repositorioSexoMock as unknown as RepositorioSexo,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    it("retorna 400 quando usuario nao tem endereco", async () => {
        const agora = new Date();
        repositorioUsuarioMock.buscar.mockResolvedValue(
            new Usuario({
                id: 30,
                nome: "Consumidor Teste",
                email: "consumidor@teste.com",
                senha: "hash",
                role: Role.CONSUMIDOR,
                ativo: true,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );
        repositorioEnderecoMock.buscarPorUsuarioId.mockResolvedValue(null);

        const promessa = servico.criar(30, { cpf: "123.456.789-00" });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Usuario deve ter endereco",
            statusCode: 400,
        });
        expect(repositorioConsumidorMock.criar).not.toHaveBeenCalled();
    });

    it("cria consumidor quando usuario, endereco e cpf sao validos", async () => {
        const agora = new Date();
        repositorioUsuarioMock.buscar.mockResolvedValue(
            new Usuario({
                id: 30,
                nome: "Consumidor Teste",
                email: "consumidor@teste.com",
                senha: "hash",
                role: Role.CONSUMIDOR,
                ativo: true,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );
        repositorioEnderecoMock.buscarPorUsuarioId.mockResolvedValue(
            new Endereco({
                id: 1,
                cep: "01001-000",
                numero: "100",
                usuarioId: 30,
                ruaId: 1,
                bairroId: 1,
                cidadeId: 1,
                estadoId: 1,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );
        repositorioConsumidorMock.buscarPorUsuarioId.mockResolvedValue(null);
        repositorioConsumidorMock.buscarPorCpf.mockResolvedValue(null);
        repositorioConsumidorMock.criar.mockResolvedValue(
            new Consumidor({
                id: 9,
                cpf: "123.456.789-00",
                pontos: 0,
                nivel: 1,
                sexoId: null,
                lojistaId: null,
                usuarioId: 30,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(30, { cpf: " 123.456.789-00 " });

        expect(repositorioConsumidorMock.criar).toHaveBeenCalledWith({
            cpf: "123.456.789-00",
            usuarioId: 30,
            sexoId: null,
            lojistaId: null,
        });
        expect(resultado).toMatchObject({
            id: 9,
            cpf: "123.456.789-00",
            usuarioId: 30,
            pontos: 0,
            nivel: 1,
            lojistaId: null,
        });
        expect(repositorioLojistaMock.buscar).not.toHaveBeenCalled();
    });

    it("ignora lojistaId enviado no cadastro e persiste null", async () => {
        const agora = new Date();
        repositorioUsuarioMock.buscar.mockResolvedValue(
            new Usuario({
                id: 30,
                nome: "Consumidor Teste",
                email: "consumidor@teste.com",
                senha: "hash",
                role: Role.CONSUMIDOR,
                ativo: true,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );
        repositorioEnderecoMock.buscarPorUsuarioId.mockResolvedValue(
            new Endereco({
                id: 1,
                cep: "01001-000",
                numero: "100",
                usuarioId: 30,
                ruaId: 1,
                bairroId: 1,
                cidadeId: 1,
                estadoId: 1,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );
        repositorioConsumidorMock.buscarPorUsuarioId.mockResolvedValue(null);
        repositorioConsumidorMock.buscarPorCpf.mockResolvedValue(null);
        repositorioConsumidorMock.criar.mockResolvedValue(
            new Consumidor({
                id: 9,
                cpf: "123.456.789-00",
                pontos: 0,
                nivel: 1,
                sexoId: null,
                lojistaId: null,
                usuarioId: 30,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        await servico.criar(30, {
            cpf: "123.456.789-00",
            lojistaId: 123,
        } as { cpf: string; lojistaId: number });

        expect(repositorioConsumidorMock.criar).toHaveBeenCalledWith({
            cpf: "123.456.789-00",
            usuarioId: 30,
            sexoId: null,
            lojistaId: null,
        });
        expect(repositorioLojistaMock.buscar).not.toHaveBeenCalled();
    });
});
