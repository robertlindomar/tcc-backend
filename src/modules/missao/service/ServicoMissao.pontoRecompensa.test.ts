import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Missao } from "../model/Missao";
import { RepositorioMissao } from "../repository/RepositorioMissao";
import { ServicoMissao } from "./ServicoMissao";

describe("ServicoMissao pontoRecompensa", () => {
    let repositorioMissaoMock: {
        criar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoMissao;

    function missaoComPontos(pontos: number): Missao {
        const agora = new Date();
        return new Missao({
            id: 4,
            nome: "Visite a loja",
            descricao: null,
            pontoRecompensa: pontos,
            lojistaId: 5,
            tokenQr: "cd".repeat(32),
            dataCriacao: agora,
            dataAtualizacao: agora,
        });
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
        );
    });

    it("criar com 0 retorna 400", async () => {
        await expect(servico.criar(20, { nome: "M", pontoRecompensa: 0 })).rejects.toMatchObject({
            statusCode: 400,
        });
        expect(repositorioMissaoMock.criar).not.toHaveBeenCalled();
    });

    it("criar com negativo retorna 400", async () => {
        await expect(
            servico.criar(20, { nome: "M", pontoRecompensa: -1 }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("criar sem pontos retorna 400", async () => {
        await expect(
            servico.criar(20, { nome: "M" } as { nome: string; pontoRecompensa: number }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "pontoRecompensa e obrigatorio",
        });
    });

    it("criar com 1 e permitido", async () => {
        repositorioMissaoMock.criar.mockResolvedValue(missaoComPontos(1));
        const resultado = await servico.criar(20, { nome: "M", pontoRecompensa: 1 });
        expect(resultado.pontoRecompensa).toBe(1);
    });

    it("criar com 50 e permitido", async () => {
        repositorioMissaoMock.criar.mockResolvedValue(missaoComPontos(50));
        const resultado = await servico.criar(20, { nome: "M", pontoRecompensa: 50 });
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
