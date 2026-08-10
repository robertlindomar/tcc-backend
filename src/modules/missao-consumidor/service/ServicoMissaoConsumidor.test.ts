import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { Missao } from "../../missao/model/Missao";
import { RepositorioMissao } from "../../missao/repository/RepositorioMissao";
import { MissaoConsumidor } from "../model/MissaoConsumidor";
import { RepositorioMissaoConsumidor } from "../repository/RepositorioMissaoConsumidor";
import { ServicoMissaoConsumidor } from "./ServicoMissaoConsumidor";

function consumidorFake(overrides?: Partial<{
    id: number;
    pontos: number;
    nivel: number;
    usuarioId: number;
}>): Consumidor {
    const agora = new Date();
    return new Consumidor({
        id: overrides?.id ?? 5,
        cpf: "123.456.789-00",
        pontos: overrides?.pontos ?? 50,
        nivel: overrides?.nivel ?? 1,
        sexoId: null,
        lojistaId: null,
        usuarioId: overrides?.usuarioId ?? 30,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function missaoFake(id = 8, pontoRecompensa = 100): Missao {
    const agora = new Date();
    return new Missao({
        id,
        nome: "Missao Teste",
        descricao: "Descricao",
        pontoRecompensa,
        lojistaId: 1,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoMissaoConsumidor", () => {
    let repositorioMissaoConsumidorMock: {
        buscarPorMissaoEConsumidor: ReturnType<typeof vi.fn>;
        concluirComPontos: ReturnType<typeof vi.fn>;
    };
    let repositorioMissaoMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioConsumidorMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoMissaoConsumidor;

    beforeEach(() => {
        repositorioMissaoConsumidorMock = {
            buscarPorMissaoEConsumidor: vi.fn(),
            concluirComPontos: vi.fn(),
        };
        repositorioMissaoMock = {
            buscar: vi.fn(),
        };
        repositorioConsumidorMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(consumidorFake()),
        };
        servico = new ServicoMissaoConsumidor(
            repositorioMissaoConsumidorMock as unknown as RepositorioMissaoConsumidor,
            repositorioMissaoMock as unknown as RepositorioMissao,
            repositorioConsumidorMock as unknown as RepositorioConsumidor,
        );
    });

    it("conclui missao: cria vinculo e retorna pontos/nivel atualizados", async () => {
        const agora = new Date();
        const missao = missaoFake(8, 100);
        repositorioMissaoMock.buscar.mockResolvedValue(missao);
        repositorioMissaoConsumidorMock.buscarPorMissaoEConsumidor.mockResolvedValue(null);
        repositorioMissaoConsumidorMock.concluirComPontos.mockResolvedValue({
            missaoConsumidor: new MissaoConsumidor({
                id: 1,
                missaoId: 8,
                consumidorId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
            consumidor: consumidorFake({ id: 5, pontos: 150, nivel: 2 }),
        });

        const resultado = await servico.criar(30, { missaoId: 8 });

        expect(repositorioConsumidorMock.buscarPorUsuarioId).toHaveBeenCalledWith(30);
        expect(repositorioMissaoMock.buscar).toHaveBeenCalledWith(8);
        expect(
            repositorioMissaoConsumidorMock.buscarPorMissaoEConsumidor,
        ).toHaveBeenCalledWith(8, 5);
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledWith({
            missaoId: 8,
            consumidorId: 5,
            pontoRecompensa: 100,
        });
        expect(resultado.missaoConsumidor).toMatchObject({
            id: 1,
            missaoId: 8,
            consumidorId: 5,
            nomeMissao: "Missao Teste",
            pontoRecompensa: 100,
        });
        expect(resultado.consumidor).toMatchObject({
            id: 5,
            pontos: 150,
            nivel: 2,
        });
    });

    it("retorna 404 quando missao nao existe", async () => {
        repositorioMissaoMock.buscar.mockResolvedValue(null);

        const promessa = servico.criar(30, { missaoId: 99 });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Missao nao encontrada",
            statusCode: 404,
        });
        expect(
            repositorioMissaoConsumidorMock.concluirComPontos,
        ).not.toHaveBeenCalled();
    });

    it("retorna 400 quando missao ja foi concluida", async () => {
        const agora = new Date();
        repositorioMissaoMock.buscar.mockResolvedValue(missaoFake(8));
        repositorioMissaoConsumidorMock.buscarPorMissaoEConsumidor.mockResolvedValue(
            new MissaoConsumidor({
                id: 1,
                missaoId: 8,
                consumidorId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const promessa = servico.criar(30, { missaoId: 8 });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Missao ja concluida",
            statusCode: 400,
        });
        expect(
            repositorioMissaoConsumidorMock.concluirComPontos,
        ).not.toHaveBeenCalled();
    });
});
