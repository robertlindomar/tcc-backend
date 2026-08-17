import { beforeEach, describe, expect, it, vi } from "vitest";
import { FrequenciaMissao, StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioMissaoConsumidor } from "../../missao-consumidor/repository/RepositorioMissaoConsumidor";
import { Missao } from "../model/Missao";
import { RepositorioMissao } from "../repository/RepositorioMissao";
import { ServicoMissao } from "./ServicoMissao";

function missaoFake(overrides?: Partial<{
    frequencia: FrequenciaMissao;
    dataFim: Date | null;
    pontoRecompensa: number;
}>): Missao {
    const agora = new Date("2026-08-17T15:00:00.000Z");
    return new Missao({
        id: 4,
        nome: "Visite nosso lancamento",
        descricao: null,
        pontoRecompensa: overrides?.pontoRecompensa ?? 20,
        frequencia: overrides?.frequencia ?? FrequenciaMissao.SEMANAL,
        dataFim: overrides?.dataFim ?? new Date("2026-09-30T23:59:59.999-03:00"),
        lojistaId: 5,
        tokenQr: "cd".repeat(32),
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

const criarValido = {
    nome: "Visite nosso lancamento",
    pontoRecompensa: 20,
    frequencia: FrequenciaMissao.SEMANAL,
    dataFim: "2026-09-30",
};

describe("ServicoMissao frequencia e validade", () => {
    let repositorioMissaoMock: {
        criar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let repositorioMissaoConsumidorMock: { contarPorMissaoId: ReturnType<typeof vi.fn> };
    let servico: ServicoMissao;

    beforeEach(() => {
        repositorioMissaoMock = {
            criar: vi.fn(),
            atualizar: vi.fn(),
            buscar: vi.fn(),
        };
        repositorioMissaoConsumidorMock = {
            contarPorMissaoId: vi.fn().mockResolvedValue(0),
        };
        servico = new ServicoMissao(
            repositorioMissaoMock as unknown as RepositorioMissao,
            {
                buscarPorUsuarioId: vi.fn().mockResolvedValue(
                    lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
                ),
            } as unknown as RepositorioLojista,
            repositorioMissaoConsumidorMock as unknown as RepositorioMissaoConsumidor,
        );
    });

    it("criar exige frequencia e dataFim", async () => {
        await expect(
            servico.criar(20, { nome: "M", pontoRecompensa: 5 } as never),
        ).rejects.toMatchObject({ message: "frequencia invalida", statusCode: 400 });
        expect(repositorioMissaoMock.criar).not.toHaveBeenCalled();
    });

    it("criar sem dataFim retorna 400", async () => {
        await expect(
            servico.criar(20, {
                nome: "M",
                pontoRecompensa: 5,
                frequencia: FrequenciaMissao.DIARIA,
            } as never),
        ).rejects.toMatchObject({ message: "dataFim e obrigatoria", statusCode: 400 });
    });

    it("criar nao aceita frequencia inventada", async () => {
        await expect(
            servico.criar(20, {
                ...criarValido,
                frequencia: "SEMPRE" as never,
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("criar persiste frequencia e validade", async () => {
        repositorioMissaoMock.criar.mockResolvedValue(missaoFake());
        const resultado = await servico.criar(20, criarValido);
        expect(repositorioMissaoMock.criar).toHaveBeenCalledWith(
            expect.objectContaining({
                frequencia: FrequenciaMissao.SEMANAL,
                dataFim: expect.any(Date),
                lojistaId: 5,
            }),
        );
        expect(resultado.frequencia).toBe(FrequenciaMissao.SEMANAL);
        expect(resultado.dataFimCivil).toBe("2026-09-30");
        expect(resultado.expirada).toBe(false);
        expect(resultado.tokenQr).toBeDefined();
    });

    it("alterar frequencia sem conclusao e permitido", async () => {
        repositorioMissaoMock.buscar.mockResolvedValue(missaoFake());
        repositorioMissaoMock.atualizar.mockResolvedValue(
            missaoFake({ frequencia: FrequenciaMissao.DIARIA }),
        );
        await servico.atualizar(20, "4", { frequencia: FrequenciaMissao.DIARIA });
        expect(repositorioMissaoConsumidorMock.contarPorMissaoId).toHaveBeenCalledWith(4);
        expect(repositorioMissaoMock.atualizar).toHaveBeenCalledWith(
            4,
            expect.objectContaining({ frequencia: FrequenciaMissao.DIARIA }),
        );
    });

    it("alterar frequencia apos conclusao retorna 409", async () => {
        repositorioMissaoMock.buscar.mockResolvedValue(missaoFake());
        repositorioMissaoConsumidorMock.contarPorMissaoId.mockResolvedValue(1);
        await expect(
            servico.atualizar(20, "4", { frequencia: FrequenciaMissao.MENSAL }),
        ).rejects.toMatchObject({
            message: "Nao e permitido alterar a frequencia apos conclusoes",
            statusCode: 409,
        });
        expect(repositorioMissaoMock.atualizar).not.toHaveBeenCalled();
    });

    it("alterar dataFim nao troca tokenQr", async () => {
        const existente = missaoFake();
        repositorioMissaoMock.buscar.mockResolvedValue(existente);
        repositorioMissaoMock.atualizar.mockResolvedValue(
            missaoFake({ dataFim: new Date("2026-12-31T23:59:59.999-03:00") }),
        );
        const resultado = await servico.atualizar(20, "4", { dataFim: "2026-12-31" });
        expect(resultado.tokenQr).toBe(existente.tokenQr);
        expect(repositorioMissaoMock.atualizar).toHaveBeenCalledWith(
            4,
            expect.objectContaining({ dataFim: expect.any(Date) }),
        );
        expect(repositorioMissaoMock.atualizar.mock.calls[0][1].tokenQr).toBeUndefined();
    });
});

describe("ServicoMissao pontoRecompensa", () => {
    let repositorioMissaoMock: {
        criar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoMissao;

    function missaoComPontos(pontos: number): Missao {
        return missaoFake({ pontoRecompensa: pontos });
    }

    beforeEach(() => {
        repositorioMissaoMock = {
            criar: vi.fn(),
            atualizar: vi.fn(),
            buscar: vi.fn(),
        };
        servico = new ServicoMissao(
            repositorioMissaoMock as unknown as RepositorioMissao,
            {
                buscarPorUsuarioId: vi.fn().mockResolvedValue(
                    lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
                ),
            } as unknown as RepositorioLojista,
            { contarPorMissaoId: vi.fn().mockResolvedValue(0) } as unknown as RepositorioMissaoConsumidor,
        );
    });

    it("criar com 0 retorna 400", async () => {
        await expect(
            servico.criar(20, { ...criarValido, nome: "M", pontoRecompensa: 0 }),
        ).rejects.toMatchObject({
            statusCode: 400,
        });
        expect(repositorioMissaoMock.criar).not.toHaveBeenCalled();
    });

    it("criar com negativo retorna 400", async () => {
        await expect(
            servico.criar(20, { ...criarValido, pontoRecompensa: -1 }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("criar sem pontos retorna 400", async () => {
        await expect(
            servico.criar(20, { nome: "M", frequencia: FrequenciaMissao.UMA_VEZ, dataFim: "2026-12-31" } as never),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "pontoRecompensa e obrigatorio",
        });
    });

    it("criar com 1 e permitido", async () => {
        repositorioMissaoMock.criar.mockResolvedValue(missaoComPontos(1));
        const resultado = await servico.criar(20, { ...criarValido, pontoRecompensa: 1 });
        expect(resultado.pontoRecompensa).toBe(1);
    });

    it("criar com 50 e permitido", async () => {
        repositorioMissaoMock.criar.mockResolvedValue(missaoComPontos(50));
        const resultado = await servico.criar(20, { ...criarValido, pontoRecompensa: 50 });
        expect(resultado.pontoRecompensa).toBe(50);
    });

    it("editar para 0 retorna 400", async () => {
        repositorioMissaoMock.buscar.mockResolvedValue(missaoComPontos(10));
        await expect(
            servico.atualizar(20, "4", { pontoRecompensa: 0 }),
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(repositorioMissaoMock.atualizar).not.toHaveBeenCalled();
    });

    it("editar para negativo retorna 400", async () => {
        repositorioMissaoMock.buscar.mockResolvedValue(missaoComPontos(10));
        await expect(
            servico.atualizar(20, "4", { pontoRecompensa: -100 }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("editar para valor valido e permitido", async () => {
        repositorioMissaoMock.buscar.mockResolvedValue(missaoComPontos(10));
        repositorioMissaoMock.atualizar.mockResolvedValue(missaoComPontos(50));
        const resultado = await servico.atualizar(20, "4", { pontoRecompensa: 50 });
        expect(resultado.pontoRecompensa).toBe(50);
    });
});
