import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Role } from "../../auth/enum/Role";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Consumidor } from "../model/Consumidor";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";
import { ServicoConsumidor } from "./ServicoConsumidor";

function consumidorFake(id: number, usuarioId: number, lojistaId: number): Consumidor {
    const agora = new Date();
    return new Consumidor({
        id,
        cpf: `000.000.000-0${id}`,
        pontos: 0,
        nivel: 1,
        sexoId: null,
        lojistaId,
        usuarioId,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoConsumidor por status do lojista", () => {
    let repositorioConsumidorMock: {
        listarPorLojistaId: ReturnType<typeof vi.fn>;
        listar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoConsumidor;

    beforeEach(() => {
        repositorioConsumidorMock = {
            listarPorLojistaId: vi.fn().mockResolvedValue([consumidorFake(1, 30, 5)]),
            listar: vi.fn(),
            buscar: vi.fn().mockResolvedValue(consumidorFake(1, 30, 5)),
        };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        servico = new ServicoConsumidor(
            repositorioConsumidorMock as unknown as RepositorioConsumidor,
            {} as RepositorioUsuario,
            {} as RepositorioEndereco,
            {} as RepositorioSexo,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    it("lojista PENDENTE nao lista consumidores da loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5 }),
        );

        await expect(
            servico.listar({ id: 20, role: Role.LOJISTA }),
        ).rejects.toMatchObject({
            message: "Lojista precisa estar APROVADO para esta operacao",
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioConsumidorMock.listarPorLojistaId).not.toHaveBeenCalled();
    });

    it("lojista REJEITADO nao lista consumidores da loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO, id: 5 }),
        );

        await expect(
            servico.listar({ id: 20, role: Role.LOJISTA }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioConsumidorMock.listarPorLojistaId).not.toHaveBeenCalled();
    });

    it("lojista APROVADO lista consumidores scoped da propria loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );

        const lista = await servico.listar({ id: 20, role: Role.LOJISTA });

        expect(repositorioConsumidorMock.listarPorLojistaId).toHaveBeenCalledWith(5);
        expect(repositorioConsumidorMock.listar).not.toHaveBeenCalled();
        expect(lista).toHaveLength(1);
    });

    it("lojista PENDENTE nao consulta consumidor por ID", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5 }),
        );

        await expect(
            servico.buscar("1", { id: 20, role: Role.LOJISTA }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("lojista APROVADO consulta consumidor da propria loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );

        const resultado = await servico.buscar("1", { id: 20, role: Role.LOJISTA });

        expect(resultado.lojistaId).toBe(5);
    });
});
