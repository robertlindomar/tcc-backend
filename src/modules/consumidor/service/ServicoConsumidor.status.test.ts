import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Role } from "../../auth/enum/Role";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";
import { ServicoConsumidor } from "./ServicoConsumidor";
import { RespostaVisitanteLoja } from "../dtos/RespostaVisitanteLoja";

function visitanteFake(id: number): RespostaVisitanteLoja {
    const agora = new Date("2026-08-17T15:00:00.000Z");
    return {
        id,
        nome: `Visitante ${id}`,
        quantidadeVisitas: 1,
        primeiraVisita: agora,
        ultimaVisita: agora,
    };
}

describe("ServicoConsumidor por status do lojista", () => {
    let repositorioConsumidorMock: {
        listarVisitantesPorLoja: ReturnType<typeof vi.fn>;
        listar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        buscarVisitanteDaLoja: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoConsumidor;

    beforeEach(() => {
        repositorioConsumidorMock = {
            listarVisitantesPorLoja: vi.fn().mockResolvedValue([visitanteFake(1)]),
            listar: vi.fn(),
            buscar: vi.fn(),
            buscarVisitanteDaLoja: vi.fn().mockResolvedValue(visitanteFake(1)),
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
        expect(repositorioConsumidorMock.listarVisitantesPorLoja).not.toHaveBeenCalled();
    });

    it("lojista REJEITADO nao lista consumidores da loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO, id: 5 }),
        );

        await expect(
            servico.listar({ id: 20, role: Role.LOJISTA }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioConsumidorMock.listarVisitantesPorLoja).not.toHaveBeenCalled();
    });

    it("lojista APROVADO lista visitantes da propria loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );

        const lista = await servico.listar({ id: 20, role: Role.LOJISTA });

        expect(repositorioConsumidorMock.listarVisitantesPorLoja).toHaveBeenCalledWith(5);
        expect(repositorioConsumidorMock.listar).not.toHaveBeenCalled();
        expect(lista.consumidores).toHaveLength(1);
        expect(lista.consumidoresUnicos).toBe(1);
        expect(lista.totalVisitas).toBe(1);
    });

    it("lojista PENDENTE nao consulta consumidor por ID", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5 }),
        );

        await expect(
            servico.buscar("1", { id: 20, role: Role.LOJISTA }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioConsumidorMock.buscarVisitanteDaLoja).not.toHaveBeenCalled();
    });

    it("lojista APROVADO consulta visitante da propria loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );

        const resultado = await servico.buscar("1", { id: 20, role: Role.LOJISTA });

        expect(repositorioConsumidorMock.buscarVisitanteDaLoja).toHaveBeenCalledWith(1, 5);
        expect(resultado).toMatchObject({
            id: 1,
            quantidadeVisitas: 1,
        });
        expect(resultado).not.toHaveProperty("cpf");
        expect(resultado).not.toHaveProperty("lojistaId");
    });
});
