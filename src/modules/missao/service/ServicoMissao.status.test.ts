import { beforeEach, describe, expect, it, vi } from "vitest";
import { FrequenciaMissao, StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioMissaoConsumidor } from "../../missao-consumidor/repository/RepositorioMissaoConsumidor";
import { Missao } from "../model/Missao";
import { RepositorioMissao } from "../repository/RepositorioMissao";
import { ServicoMissao } from "./ServicoMissao";

describe("ServicoMissao por status do lojista", () => {
    let repositorioMissaoMock: {
        criar: ReturnType<typeof vi.fn>;
        listarPorLojistaId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoMissao;

    const criarValido = {
        nome: "Visite a loja",
        pontoRecompensa: 1,
        frequencia: FrequenciaMissao.UMA_VEZ,
        dataFim: "2026-12-31",
    };

    beforeEach(() => {
        repositorioMissaoMock = {
            criar: vi.fn(),
            listarPorLojistaId: vi.fn().mockResolvedValue([]),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        servico = new ServicoMissao(
            repositorioMissaoMock as unknown as RepositorioMissao,
            repositorioLojistaMock as unknown as RepositorioLojista,
            { contarPorMissaoId: vi.fn() } as unknown as RepositorioMissaoConsumidor,
        );
    });

    it("PENDENTE nao cria missao", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );

        await expect(servico.criar(20, criarValido)).rejects.toMatchObject({
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioMissaoMock.criar).not.toHaveBeenCalled();
    });

    it("REJEITADO nao cria missao", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.criar(20, criarValido)).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioMissaoMock.criar).not.toHaveBeenCalled();
    });

    it("APROVADO cria missao", async () => {
        const agora = new Date();
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioMissaoMock.criar.mockResolvedValue(
            new Missao({
                id: 4,
                nome: "Visite a loja",
                descricao: null,
                pontoRecompensa: 50,
                frequencia: FrequenciaMissao.UMA_VEZ,
                dataFim: new Date("2026-12-31T23:59:59.999-03:00"),
                lojistaId: 5,
                tokenQr: "cd".repeat(32),
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(20, {
            ...criarValido,
            pontoRecompensa: 50,
        });

        expect(resultado.lojistaId).toBe(5);
        expect(resultado.tokenQr).toBe("cd".repeat(32));
        expect(repositorioMissaoMock.criar).toHaveBeenCalledOnce();
    });

    it("REJEITADO nao lista missoes", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.listar(20)).rejects.toMatchObject({ statusCode: 403 });
    });
});
