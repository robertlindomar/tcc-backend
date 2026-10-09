import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../auth/enum/Role";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { Usuario } from "../../usuario/model/Usuario";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Consumidor } from "../model/Consumidor";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";
import { ServicoConsumidor } from "./ServicoConsumidor";

describe("ServicoConsumidor.buscarAtual", () => {
    const agora = new Date("2026-08-17T20:00:00.000Z");
    let repositorioUsuarioMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioConsumidorMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoConsumidor;

    beforeEach(() => {
        repositorioUsuarioMock = { buscar: vi.fn() };
        repositorioConsumidorMock = { buscarPorUsuarioId: vi.fn() };
        servico = new ServicoConsumidor(
            repositorioConsumidorMock as unknown as RepositorioConsumidor,
            repositorioUsuarioMock as unknown as RepositorioUsuario,
            {} as RepositorioEndereco,
            {} as RepositorioSexo,
            {} as RepositorioLojista,
        );
    });

    it("retorna o perfil atual sem expor lojistaId", async () => {
        repositorioUsuarioMock.buscar.mockResolvedValue(
            new Usuario({
                id: 10,
                nome: "Bruno Lima",
                email: "cliente2@demo.local",
                senha: "hash",
                role: Role.CONSUMIDOR,
                ativo: true,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );
        repositorioConsumidorMock.buscarPorUsuarioId.mockResolvedValue(
            new Consumidor({
                id: 20,
                cpf: "222.333.444-55",
                pontos: 200,
                nivel: 3,
                sexoId: null,
                lojistaId: 99,
                usuarioId: 10,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resposta = await servico.buscarAtual({ id: 10, role: Role.CONSUMIDOR });

        expect(resposta).toMatchObject({
            usuario: { nome: "Bruno Lima", email: "cliente2@demo.local" },
            consumidor: { pontos: 200, nivel: 3 },
        });
        expect(resposta.consumidor).not.toHaveProperty("lojistaId");
    });

    it("recusa usuario inativo", async () => {
        repositorioUsuarioMock.buscar.mockResolvedValue(
            new Usuario({
                id: 10,
                nome: "Bruno Lima",
                email: "cliente2@demo.local",
                senha: "hash",
                role: Role.CONSUMIDOR,
                ativo: false,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        await expect(
            servico.buscarAtual({ id: 10, role: Role.CONSUMIDOR }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("recusa papel diferente de consumidor", async () => {
        await expect(servico.buscarAtual({ id: 10, role: Role.LOJISTA })).rejects.toMatchObject({
            statusCode: 403,
            message: "Este aplicativo e destinado aos consumidores",
        });
        expect(repositorioUsuarioMock.buscar).not.toHaveBeenCalled();
    });

    it("retorna 404 quando falta perfil consumidor", async () => {
        repositorioUsuarioMock.buscar.mockResolvedValue(
            new Usuario({
                id: 10,
                nome: "Bruno Lima",
                email: "cliente2@demo.local",
                senha: "hash",
                role: Role.CONSUMIDOR,
                ativo: true,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );
        repositorioConsumidorMock.buscarPorUsuarioId.mockResolvedValue(null);

        await expect(
            servico.buscarAtual({ id: 10, role: Role.CONSUMIDOR }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});
