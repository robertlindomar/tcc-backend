import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../auth/enum/Role";
import { Endereco } from "../../endereco/model/Endereco";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { Lojista } from "../../lojista/model/Lojista";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { Usuario } from "../../usuario/model/Usuario";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { StatusLojista } from "../../../generated/prisma/enums";
import { Consumidor } from "../model/Consumidor";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";
import { ServicoConsumidor } from "./ServicoConsumidor";
import { RespostaVisitanteLoja } from "../dtos/RespostaVisitanteLoja";

function agora() {
    return new Date("2026-08-17T15:00:00.000Z");
}

function usuarioConsumidorFake(id = 30) {
    return new Usuario({
        id,
        nome: "Consumidor Teste",
        email: "consumidor@teste.com",
        senha: "hash",
        role: Role.CONSUMIDOR,
        ativo: true,
        dataCriacao: agora(),
        dataAtualizacao: agora(),
    });
}

function enderecoFake(usuarioId = 30) {
    return new Endereco({
        id: 1,
        cep: "01001-000",
        numero: "100",
        usuarioId,
        ruaId: 1,
        bairroId: 1,
        cidadeId: 1,
        estadoId: 1,
        dataCriacao: agora(),
        dataAtualizacao: agora(),
    });
}

function consumidorFake(overrides: {
    id?: number;
    usuarioId?: number;
    lojistaId?: number | null;
    pontos?: number;
    nivel?: number;
} = {}) {
    return new Consumidor({
        id: overrides.id ?? 9,
        cpf: "123.456.789-00",
        pontos: overrides.pontos ?? 0,
        nivel: overrides.nivel ?? 1,
        sexoId: null,
        lojistaId: overrides.lojistaId ?? null,
        usuarioId: overrides.usuarioId ?? 30,
        dataCriacao: agora(),
        dataAtualizacao: agora(),
    });
}

function lojistaFake(id: number, usuarioId: number): Lojista {
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
        dataCriacao: agora(),
        dataAtualizacao: agora(),
    });
}

function visitanteFake(
    overrides: Partial<RespostaVisitanteLoja> & { id: number },
): RespostaVisitanteLoja {
    return {
        id: overrides.id,
        nome: overrides.nome ?? "Robert Lindomar",
        quantidadeVisitas: overrides.quantidadeVisitas ?? 1,
        primeiraVisita: overrides.primeiraVisita ?? new Date("2026-08-15T12:00:00.000Z"),
        ultimaVisita: overrides.ultimaVisita ?? new Date("2026-08-17T12:00:00.000Z"),
    };
}

describe("ServicoConsumidor visitas E4", () => {
    let repositorioConsumidorMock: {
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        buscarPorCpf: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
        listarVisitantesPorLoja: ReturnType<typeof vi.fn>;
        buscarVisitanteDaLoja: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        listar: ReturnType<typeof vi.fn>;
    };
    let repositorioUsuarioMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioEnderecoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let repositorioSexoMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: {
        buscar: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoConsumidor;

    beforeEach(() => {
        repositorioConsumidorMock = {
            buscarPorUsuarioId: vi.fn(),
            buscarPorCpf: vi.fn(),
            criar: vi.fn(),
            listarVisitantesPorLoja: vi.fn(),
            buscarVisitanteDaLoja: vi.fn(),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            listar: vi.fn(),
        };
        repositorioUsuarioMock = { buscar: vi.fn() };
        repositorioEnderecoMock = { buscarPorUsuarioId: vi.fn() };
        repositorioSexoMock = { buscar: vi.fn() };
        repositorioLojistaMock = {
            buscar: vi.fn(),
            buscarPorUsuarioId: vi.fn(),
        };
        servico = new ServicoConsumidor(
            repositorioConsumidorMock as unknown as RepositorioConsumidor,
            repositorioUsuarioMock as unknown as RepositorioUsuario,
            repositorioEnderecoMock as unknown as RepositorioEndereco,
            repositorioSexoMock as unknown as RepositorioSexo,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    async function prepararCadastro() {
        repositorioUsuarioMock.buscar.mockResolvedValue(usuarioConsumidorFake());
        repositorioEnderecoMock.buscarPorUsuarioId.mockResolvedValue(enderecoFake());
        repositorioConsumidorMock.buscarPorUsuarioId.mockResolvedValue(null);
        repositorioConsumidorMock.buscarPorCpf.mockResolvedValue(null);
        repositorioConsumidorMock.criar.mockResolvedValue(consumidorFake({ lojistaId: null }));
    }

    it("cadastro de consumidor novo persiste lojistaId null", async () => {
        await prepararCadastro();

        const resultado = await servico.criar(30, { cpf: "123.456.789-00" });

        expect(repositorioConsumidorMock.criar).toHaveBeenCalledWith({
            cpf: "123.456.789-00",
            usuarioId: 30,
            sexoId: null,
            lojistaId: null,
        });
        expect(resultado.lojistaId).toBeNull();
        expect(repositorioLojistaMock.buscar).not.toHaveBeenCalled();
    });

    it("lojistaId arbitrario no body nao define propriedade", async () => {
        await prepararCadastro();

        await servico.criar(30, {
            cpf: "123.456.789-00",
            lojistaId: 999,
        } as { cpf: string; lojistaId: number });

        expect(repositorioConsumidorMock.criar).toHaveBeenCalledWith({
            cpf: "123.456.789-00",
            usuarioId: 30,
            sexoId: null,
            lojistaId: null,
        });
        expect(repositorioLojistaMock.buscar).not.toHaveBeenCalled();
    });

    it("mesmo consumidor visita Loja A e Loja B e aparece nas duas listagens", async () => {
        const robert = visitanteFake({ id: 7, quantidadeVisitas: 1 });
        repositorioLojistaMock.buscarPorUsuarioId.mockImplementation(async (usuarioId: number) => {
            if (usuarioId === 50) {
                return lojistaFake(10, 50);
            }
            return lojistaFake(11, 51);
        });
        repositorioConsumidorMock.listarVisitantesPorLoja.mockImplementation(
            async (lojistaId: number) => {
                if (lojistaId === 10 || lojistaId === 11) {
                    return [robert];
                }
                return [];
            },
        );

        const listaA = await servico.listar({ id: 50, role: Role.LOJISTA });
        const listaB = await servico.listar({ id: 51, role: Role.LOJISTA });

        expect(listaA.consumidores.map((item) => item.id)).toEqual([7]);
        expect(listaB.consumidores.map((item) => item.id)).toEqual([7]);
    });

    it("tres visitas no tempo viram um consumidor com quantidadeVisitas 3", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(lojistaFake(10, 50));
        repositorioConsumidorMock.listarVisitantesPorLoja.mockResolvedValue([
            visitanteFake({ id: 7, quantidadeVisitas: 3 }),
        ]);

        const lista = await servico.listar({ id: 50, role: Role.LOJISTA });

        expect(lista.consumidores).toHaveLength(1);
        expect(lista.consumidoresUnicos).toBe(1);
        expect(lista.consumidores[0].quantidadeVisitas).toBe(3);
        expect(lista.totalVisitas).toBe(3);
    });

    it("conclusao de missao normal nao entra na listagem de visitas", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(lojistaFake(10, 50));
        repositorioConsumidorMock.listarVisitantesPorLoja.mockResolvedValue([]);

        const lista = await servico.listar({ id: 50, role: Role.LOJISTA });

        expect(repositorioConsumidorMock.listarVisitantesPorLoja).toHaveBeenCalledWith(10);
        expect(lista.consumidores).toEqual([]);
        expect(lista.consumidoresUnicos).toBe(0);
        expect(lista.totalVisitas).toBe(0);
    });

    it("legado lojistaId=A sem visita em A nao aparece em A; visita em B aparece so em B", async () => {
        const legado = consumidorFake({ id: 7, lojistaId: 10 });
        repositorioConsumidorMock.buscar.mockResolvedValue(legado);
        repositorioLojistaMock.buscarPorUsuarioId.mockImplementation(async (usuarioId: number) => {
            if (usuarioId === 50) {
                return lojistaFake(10, 50);
            }
            return lojistaFake(11, 51);
        });
        repositorioConsumidorMock.listarVisitantesPorLoja.mockImplementation(
            async (lojistaId: number) => {
                if (lojistaId === 11) {
                    return [visitanteFake({ id: 7, quantidadeVisitas: 1 })];
                }
                return [];
            },
        );
        repositorioConsumidorMock.buscarVisitanteDaLoja.mockImplementation(
            async (consumidorId: number, lojistaId: number) => {
                if (consumidorId === 7 && lojistaId === 11) {
                    return visitanteFake({ id: 7 });
                }
                return null;
            },
        );

        const listaA = await servico.listar({ id: 50, role: Role.LOJISTA });
        const listaB = await servico.listar({ id: 51, role: Role.LOJISTA });

        expect(listaA.consumidores).toEqual([]);
        expect(listaB.consumidores).toHaveLength(1);
        expect(listaB.consumidores[0].id).toBe(7);

        await expect(
            servico.buscar("7", { id: 50, role: Role.LOJISTA }),
        ).rejects.toMatchObject({ statusCode: 404 });
        await expect(
            servico.buscar("7", { id: 51, role: Role.LOJISTA }),
        ).resolves.toMatchObject({ id: 7 });
    });

    it("PUT ignora lojistaId do body e nao regrava o FK legado", async () => {
        repositorioConsumidorMock.buscar.mockResolvedValue(
            consumidorFake({ id: 9, lojistaId: 10 }),
        );
        repositorioConsumidorMock.atualizar.mockResolvedValue(
            consumidorFake({ id: 9, lojistaId: 10 }),
        );

        await servico.atualizar(
            "9",
            { id: 30, role: Role.CONSUMIDOR },
            { cpf: "123.456.789-00", lojistaId: 999 } as {
                cpf: string;
                lojistaId: number;
            },
        );

        expect(repositorioConsumidorMock.atualizar).toHaveBeenCalledWith(9, {
            cpf: "123.456.789-00",
            sexoId: null,
        });
        expect(repositorioLojistaMock.buscar).not.toHaveBeenCalled();
    });
});
