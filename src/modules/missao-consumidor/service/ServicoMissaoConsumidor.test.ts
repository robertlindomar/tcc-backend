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
        tokenQr: "ab".repeat(32),
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoMissaoConsumidor", () => {
    let repositorioMissaoConsumidorMock: {
        buscarPorMissaoEConsumidor: ReturnType<typeof vi.fn>;
        concluirComPontos: ReturnType<typeof vi.fn>;
    };
    let repositorioMissaoMock: {
        buscar: ReturnType<typeof vi.fn>;
        buscarPorTokenQr: ReturnType<typeof vi.fn>;
    };
    let repositorioConsumidorMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoMissaoConsumidor;

    beforeEach(() => {
        repositorioMissaoConsumidorMock = {
            buscarPorMissaoEConsumidor: vi.fn(),
            concluirComPontos: vi.fn(),
        };
        repositorioMissaoMock = {
            buscar: vi.fn(),
            buscarPorTokenQr: vi.fn(),
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

    it("conclui missao por token: cria vinculo e retorna pontos/nivel atualizados", async () => {
        const agora = new Date();
        const missao = missaoFake(8, 100);
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missao);
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

        const resultado = await servico.concluirPorToken(30, { tokenQr: missao.tokenQr });

        expect(repositorioConsumidorMock.buscarPorUsuarioId).toHaveBeenCalledWith(30);
        expect(repositorioMissaoMock.buscarPorTokenQr).toHaveBeenCalledWith(missao.tokenQr);
        expect(repositorioMissaoMock.buscar).not.toHaveBeenCalled();
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

    it("retorna 404 quando o token nao existe", async () => {
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(null);

        const promessa = servico.concluirPorToken(30, { tokenQr: "naoexiste" });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Missao nao encontrada",
            statusCode: 404,
        });
        expect(
            repositorioMissaoConsumidorMock.concluirComPontos,
        ).not.toHaveBeenCalled();
    });

    it("retorna 409 quando missao ja foi concluida", async () => {
        const agora = new Date();
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missaoFake(8));
        repositorioMissaoConsumidorMock.buscarPorMissaoEConsumidor.mockResolvedValue(
            new MissaoConsumidor({
                id: 1,
                missaoId: 8,
                consumidorId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const promessa = servico.concluirPorToken(30, { tokenQr: missaoFake().tokenQr });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Missao ja concluida",
            statusCode: 409,
        });
        expect(
            repositorioMissaoConsumidorMock.concluirComPontos,
        ).not.toHaveBeenCalled();
    });

    it("conclui por tokenQr e ignora consumidorId do body", async () => {
        const agora = new Date();
        const missao = missaoFake(8, 50);
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missao);
        repositorioMissaoConsumidorMock.buscarPorMissaoEConsumidor.mockResolvedValue(null);
        repositorioMissaoConsumidorMock.concluirComPontos.mockResolvedValue({
            missaoConsumidor: new MissaoConsumidor({
                id: 2,
                missaoId: 8,
                consumidorId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
            consumidor: consumidorFake({ id: 5, pontos: 100, nivel: 1 }),
        });

        const resultado = await servico.concluirPorToken(30, {
            tokenQr: `tcc://missao/${missao.tokenQr}`,
            consumidorId: 999,
            pontoRecompensa: 9999,
        } as never);

        expect(repositorioMissaoMock.buscarPorTokenQr).toHaveBeenCalledWith(missao.tokenQr);
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledWith({
            missaoId: 8,
            consumidorId: 5,
            pontoRecompensa: 50,
        });
        expect(resultado.consumidor.pontos).toBe(100);
    });

    it("body so com missaoId nao conclui (exige tokenQr)", async () => {
        await expect(
            servico.concluirPorToken(30, { missaoId: 1 } as never),
        ).rejects.toMatchObject({
            message: "tokenQr invalido",
            statusCode: 400,
        });
        expect(repositorioMissaoMock.buscar).not.toHaveBeenCalled();
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("token inexistente retorna 404", async () => {
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(null);

        const promessa = servico.concluirPorToken(30, { tokenQr: "naoexiste" });

        await expect(promessa).rejects.toMatchObject({
            message: "Missao nao encontrada",
            statusCode: 404,
        });
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("segundo scan por token nao credita de novo (409)", async () => {
        const agora = new Date();
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missaoFake(8, 50));
        repositorioMissaoConsumidorMock.buscarPorMissaoEConsumidor.mockResolvedValue(
            new MissaoConsumidor({
                id: 1,
                missaoId: 8,
                consumidorId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        await expect(
            servico.concluirPorToken(30, { tokenQr: missaoFake().tokenQr }),
        ).rejects.toMatchObject({ statusCode: 409 });
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("concorrencia: UNIQUE vira 409 e nao duplica credito no servico", async () => {
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missaoFake(8, 50));
        repositorioMissaoConsumidorMock.buscarPorMissaoEConsumidor.mockResolvedValue(null);
        repositorioMissaoConsumidorMock.concluirComPontos
            .mockResolvedValueOnce({
                missaoConsumidor: new MissaoConsumidor({
                    id: 1,
                    missaoId: 8,
                    consumidorId: 5,
                    dataCriacao: new Date(),
                    dataAtualizacao: new Date(),
                }),
                consumidor: consumidorFake({ pontos: 200 }),
            })
            .mockRejectedValueOnce(new ErroAplicacao("Missao ja concluida", 409));

        const token = { tokenQr: missaoFake().tokenQr };
        const [a, b] = await Promise.allSettled([
            servico.concluirPorToken(30, token),
            servico.concluirPorToken(30, token),
        ]);

        expect(a.status === "fulfilled" || b.status === "fulfilled").toBe(true);
        const rejeitado = a.status === "rejected" ? a : b;
        expect(rejeitado.status).toBe("rejected");
        expect((rejeitado as PromiseRejectedResult).reason).toMatchObject({
            statusCode: 409,
        });
    });
});
