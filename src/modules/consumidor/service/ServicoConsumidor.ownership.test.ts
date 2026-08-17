import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { Lojista } from "../../lojista/model/Lojista";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { StatusLojista } from "../../../generated/prisma/enums";
import { Consumidor } from "../model/Consumidor";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";
import { ServicoConsumidor } from "./ServicoConsumidor";
import { RespostaVisitanteLoja } from "../dtos/RespostaVisitanteLoja";

function consumidorFake(overrides: {
    id: number;
    usuarioId: number;
    lojistaId: number | null;
}): Consumidor {
    const agora = new Date();
    return new Consumidor({
        id: overrides.id,
        cpf: `000.000.000-0${overrides.id}`,
        pontos: 0,
        nivel: 1,
        sexoId: null,
        lojistaId: overrides.lojistaId,
        usuarioId: overrides.usuarioId,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function lojistaFake(id: number, usuarioId: number): Lojista {
    const agora = new Date();
    return new Lojista({
        id,
        nomeFantasia: `Loja ${id}`,
        razaoSocial: `Loja ${id} LTDA`,
        cnpj: `22.222.222/0001-0${id}`,
        inscricaoEstadual: null,
        status: StatusLojista.APROVADO,
        usuarioId,
        associacaoId: 1,
        enderecoId: null,
        justificativaRejeicao: null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function visitanteFake(
    overrides: Partial<RespostaVisitanteLoja> & { id: number },
): RespostaVisitanteLoja {
    const agora = new Date("2026-08-17T15:00:00.000Z");
    return {
        id: overrides.id,
        nome: overrides.nome ?? `Visitante ${overrides.id}`,
        quantidadeVisitas: overrides.quantidadeVisitas ?? 1,
        primeiraVisita: overrides.primeiraVisita ?? agora,
        ultimaVisita: overrides.ultimaVisita ?? agora,
    };
}

describe("ServicoConsumidor ownership", () => {
    const consumidorA = consumidorFake({ id: 1, usuarioId: 30, lojistaId: 10 });
    const consumidorB = consumidorFake({ id: 2, usuarioId: 31, lojistaId: 11 });

    let repositorioConsumidorMock: {
        buscar: ReturnType<typeof vi.fn>;
        listar: ReturnType<typeof vi.fn>;
        listarVisitantesPorLoja: ReturnType<typeof vi.fn>;
        buscarVisitanteDaLoja: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        buscarPorCpf: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: {
        buscar: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoConsumidor;

    beforeEach(() => {
        repositorioConsumidorMock = {
            buscar: vi.fn(),
            listar: vi.fn(),
            listarVisitantesPorLoja: vi.fn(),
            buscarVisitanteDaLoja: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
            buscarPorUsuarioId: vi.fn(),
            buscarPorCpf: vi.fn(),
            criar: vi.fn(),
        };
        repositorioLojistaMock = {
            buscar: vi.fn(),
            buscarPorUsuarioId: vi.fn(),
        };
        servico = new ServicoConsumidor(
            repositorioConsumidorMock as unknown as RepositorioConsumidor,
            {} as RepositorioUsuario,
            {} as RepositorioEndereco,
            {} as RepositorioSexo,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    it("consumidor A acessa o proprio registro", async () => {
        repositorioConsumidorMock.buscar.mockResolvedValue(consumidorA);

        const resultado = await servico.buscar("1", { id: 30, role: Role.CONSUMIDOR });

        expect(resultado.id).toBe(1);
        expect(resultado).toMatchObject({ usuarioId: 30 });
    });

    it("consumidor A nao acessa consumidor B", async () => {
        repositorioConsumidorMock.buscar.mockResolvedValue(consumidorB);

        await expect(
            servico.buscar("2", { id: 30, role: Role.CONSUMIDOR }),
        ).rejects.toMatchObject({ statusCode: 403 } satisfies Partial<ErroAplicacao>);
    });

    it("lojista A lista somente visitantes da propria loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(lojistaFake(10, 50));
        repositorioConsumidorMock.listarVisitantesPorLoja.mockResolvedValue([
            visitanteFake({ id: 1, nome: "Robert", quantidadeVisitas: 2 }),
        ]);

        const lista = await servico.listar({ id: 50, role: Role.LOJISTA });

        expect(repositorioConsumidorMock.listarVisitantesPorLoja).toHaveBeenCalledWith(10);
        expect(repositorioConsumidorMock.listar).not.toHaveBeenCalled();
        expect(lista.consumidores).toHaveLength(1);
        expect(lista.consumidoresUnicos).toBe(1);
        expect(lista.totalVisitas).toBe(2);
        expect(lista.consumidores[0].id).toBe(1);
        expect(lista.consumidores[0]).not.toHaveProperty("cpf");
        expect(lista.consumidores[0]).not.toHaveProperty("lojistaId");
    });

    it("lojista A recebe 404 ao consultar consumidor que so visitou outra loja", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(lojistaFake(10, 50));
        repositorioConsumidorMock.buscarVisitanteDaLoja.mockResolvedValue(null);

        await expect(
            servico.buscar("2", { id: 50, role: Role.LOJISTA }),
        ).rejects.toMatchObject({
            message: "Consumidor nao encontrado",
            statusCode: 404,
        });
        expect(repositorioConsumidorMock.buscarVisitanteDaLoja).toHaveBeenCalledWith(2, 10);
        expect(repositorioConsumidorMock.buscar).not.toHaveBeenCalled();
    });

    it("associacao nao recebe dump global de consumidores", async () => {
        await expect(
            servico.listar({ id: 1, role: Role.ASSOCIACAO }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioConsumidorMock.listar).not.toHaveBeenCalled();
        expect(repositorioConsumidorMock.listarVisitantesPorLoja).not.toHaveBeenCalled();
    });

    it("consumidor nao lista outros consumidores", async () => {
        await expect(
            servico.listar({ id: 30, role: Role.CONSUMIDOR }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});
