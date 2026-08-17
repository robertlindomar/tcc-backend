import { beforeEach, describe, expect, it, vi } from "vitest";
import { FrequenciaMissao, StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { instanteCivilNoFuso } from "../../../shared/tempo/fusoNegocio";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
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
    lojistaId: number | null;
}>): Consumidor {
    const agora = new Date();
    return new Consumidor({
        id: overrides?.id ?? 5,
        cpf: "123.456.789-00",
        pontos: overrides?.pontos ?? 50,
        nivel: overrides?.nivel ?? 1,
        sexoId: null,
        lojistaId: overrides?.lojistaId ?? null,
        usuarioId: overrides?.usuarioId ?? 30,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function missaoFake(overrides?: Partial<{
    id: number;
    pontoRecompensa: number;
    frequencia: FrequenciaMissao;
    dataFim: Date | null;
    sistema: boolean;
    lojistaId: number;
}>): Missao {
    const agora = new Date();
    return new Missao({
        id: overrides?.id ?? 8,
        nome: "Missao Teste",
        descricao: "Descricao",
        pontoRecompensa: overrides?.pontoRecompensa ?? 100,
        frequencia: overrides?.frequencia ?? FrequenciaMissao.UMA_VEZ,
        dataFim: overrides?.dataFim === undefined
            ? new Date("2026-12-31T23:59:59.999-03:00")
            : overrides.dataFim,
        sistema: overrides?.sistema ?? false,
        lojistaId: overrides?.lojistaId ?? 1,
        tokenQr: "ab".repeat(32),
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function vinculoFake(chavePeriodo = "UNICA"): MissaoConsumidor {
    const agora = new Date();
    return new MissaoConsumidor({
        id: 1,
        missaoId: 8,
        consumidorId: 5,
        chavePeriodo,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

const meioDiaSp = (ano: number, mes: number, dia: number) =>
    instanteCivilNoFuso({ ano, mes, dia, hora: 12, minuto: 0, segundo: 0 });

describe("ServicoMissaoConsumidor", () => {
    let repositorioMissaoConsumidorMock: {
        buscarPorMissaoConsumidorPeriodo: ReturnType<typeof vi.fn>;
        concluirComPontos: ReturnType<typeof vi.fn>;
        listarPorConsumidorId: ReturnType<typeof vi.fn>;
    };
    let repositorioMissaoMock: {
        buscar: ReturnType<typeof vi.fn>;
        buscarPorTokenQr: ReturnType<typeof vi.fn>;
    };
    let repositorioConsumidorMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: { buscar: ReturnType<typeof vi.fn> };
    let servico: ServicoMissaoConsumidor;

    beforeEach(() => {
        repositorioMissaoConsumidorMock = {
            buscarPorMissaoConsumidorPeriodo: vi.fn().mockResolvedValue(null),
            concluirComPontos: vi.fn(),
            listarPorConsumidorId: vi.fn().mockResolvedValue([]),
        };
        repositorioMissaoMock = {
            buscar: vi.fn(),
            buscarPorTokenQr: vi.fn(),
        };
        repositorioConsumidorMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(consumidorFake()),
        };
        repositorioLojistaMock = {
            buscar: vi.fn().mockResolvedValue(
                lojistaFake({ status: StatusLojista.APROVADO, id: 1 }),
            ),
        };
        servico = new ServicoMissaoConsumidor(
            repositorioMissaoConsumidorMock as unknown as RepositorioMissaoConsumidor,
            repositorioMissaoMock as unknown as RepositorioMissao,
            repositorioConsumidorMock as unknown as RepositorioConsumidor,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    async function concluir(missao: Missao, agora: Date) {
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missao);
        repositorioMissaoConsumidorMock.concluirComPontos.mockResolvedValue({
            missaoConsumidor: vinculoFake(),
            consumidor: consumidorFake({ pontos: 150, nivel: 2 }),
        });
        return servico.concluirPorToken(30, { tokenQr: missao.tokenQr }, agora);
    }

    it("conclui missao por token: cria vinculo e retorna pontos/nivel atualizados", async () => {
        const missao = missaoFake({ pontoRecompensa: 100 });
        const resultado = await concluir(missao, meioDiaSp(2026, 8, 17));

        expect(repositorioConsumidorMock.buscarPorUsuarioId).toHaveBeenCalledWith(30);
        expect(repositorioMissaoMock.buscarPorTokenQr).toHaveBeenCalledWith(missao.tokenQr);
        expect(
            repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo,
        ).toHaveBeenCalledWith(8, 5, "UNICA");
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledWith({
            missaoId: 8,
            consumidorId: 5,
            chavePeriodo: "UNICA",
            pontoRecompensa: 100,
        });
        expect(resultado.missaoConsumidor).toMatchObject({
            id: 1,
            missaoId: 8,
            consumidorId: 5,
            nomeMissao: "Missao Teste",
            pontoRecompensa: 100,
        });
        expect(resultado.consumidor).toMatchObject({ pontos: 150, nivel: 2 });
    });

    it("retorna 404 quando o token nao existe", async () => {
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(null);
        await expect(
            servico.concluirPorToken(30, { tokenQr: "naoexiste" }),
        ).rejects.toMatchObject({
            message: "Missao nao encontrada",
            statusCode: 404,
        });
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("UMA_VEZ: segunda conclusao e bloqueada", async () => {
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missaoFake());
        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(
            vinculoFake("UNICA"),
        );
        await expect(
            servico.concluirPorToken(30, { tokenQr: missaoFake().tokenQr }, meioDiaSp(2026, 9, 17)),
        ).rejects.toMatchObject({
            message: "Missao ja concluida neste periodo",
            statusCode: 409,
        });
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("DIARIA: primeira do dia passa, segunda no mesmo dia bloqueia, dia seguinte passa", async () => {
        const missao = missaoFake({ frequencia: FrequenciaMissao.DIARIA, pontoRecompensa: 5 });
        await concluir(missao, meioDiaSp(2026, 8, 17));
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledWith(
            expect.objectContaining({ chavePeriodo: "2026-08-17" }),
        );

        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(
            vinculoFake("2026-08-17"),
        );
        await expect(
            servico.concluirPorToken(30, { tokenQr: missao.tokenQr }, meioDiaSp(2026, 8, 17)),
        ).rejects.toMatchObject({ statusCode: 409 });

        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(null);
        await concluir(missao, meioDiaSp(2026, 8, 18));
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenLastCalledWith(
            expect.objectContaining({ chavePeriodo: "2026-08-18" }),
        );
    });

    it("SEMANAL: sexta da mesma semana bloqueia; segunda seguinte passa", async () => {
        const missao = missaoFake({ frequencia: FrequenciaMissao.SEMANAL });
        await concluir(missao, meioDiaSp(2026, 8, 17));
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledWith(
            expect.objectContaining({ chavePeriodo: "2026-W34" }),
        );

        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(
            vinculoFake("2026-W34"),
        );
        await expect(
            servico.concluirPorToken(30, { tokenQr: missao.tokenQr }, meioDiaSp(2026, 8, 21)),
        ).rejects.toMatchObject({ statusCode: 409 });

        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(null);
        await concluir(missao, meioDiaSp(2026, 8, 24));
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenLastCalledWith(
            expect.objectContaining({ chavePeriodo: "2026-W35" }),
        );
    });

    it("MENSAL: mesmo mes bloqueia; mes seguinte passa", async () => {
        const missao = missaoFake({ frequencia: FrequenciaMissao.MENSAL });
        await concluir(missao, meioDiaSp(2026, 8, 5));
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledWith(
            expect.objectContaining({ chavePeriodo: "2026-08" }),
        );

        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(
            vinculoFake("2026-08"),
        );
        await expect(
            servico.concluirPorToken(30, { tokenQr: missao.tokenQr }, meioDiaSp(2026, 8, 28)),
        ).rejects.toMatchObject({ statusCode: 409 });

        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(null);
        await concluir(missao, meioDiaSp(2026, 9, 1));
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenLastCalledWith(
            expect.objectContaining({ chavePeriodo: "2026-09" }),
        );
    });

    it("missao expirada nao cria vinculo nem credita (400 Missao expirada)", async () => {
        const missao = missaoFake({
            dataFim: instanteCivilNoFuso({
                ano: 2026,
                mes: 8,
                dia: 1,
                hora: 23,
                minuto: 59,
                segundo: 59,
            }),
        });
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missao);

        await expect(
            servico.concluirPorToken(30, { tokenQr: missao.tokenQr }, meioDiaSp(2026, 8, 17)),
        ).rejects.toMatchObject({ message: "Missao expirada", statusCode: 400 });
        expect(
            repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo,
        ).not.toHaveBeenCalled();
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("no limite exato (agora = dataFim) ainda permite concluir", async () => {
        const dataFim = instanteCivilNoFuso({
            ano: 2026,
            mes: 8,
            dia: 17,
            hora: 23,
            minuto: 59,
            segundo: 59,
        });
        const missao = missaoFake({ dataFim });
        await concluir(missao, dataFim);
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalled();
    });

    it("conclui por tokenQr e ignora consumidorId/pontos/frequencia do body", async () => {
        const missao = missaoFake({ pontoRecompensa: 50 });
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missao);
        repositorioMissaoConsumidorMock.concluirComPontos.mockResolvedValue({
            missaoConsumidor: vinculoFake(),
            consumidor: consumidorFake({ pontos: 100 }),
        });

        const resultado = await servico.concluirPorToken(
            30,
            {
                tokenQr: `tcc://missao/${missao.tokenQr}`,
                consumidorId: 999,
                pontoRecompensa: 9999,
                frequencia: FrequenciaMissao.DIARIA,
                chavePeriodo: "2020-01-01",
            } as never,
            meioDiaSp(2026, 8, 17),
        );

        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledWith({
            missaoId: 8,
            consumidorId: 5,
            chavePeriodo: "UNICA",
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
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("concorrencia DIARIA: UNIQUE vira 409 e so um credito no servico", async () => {
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(
            missaoFake({ frequencia: FrequenciaMissao.DIARIA, pontoRecompensa: 5 }),
        );
        repositorioMissaoConsumidorMock.concluirComPontos
            .mockResolvedValueOnce({
                missaoConsumidor: vinculoFake("2026-08-17"),
                consumidor: consumidorFake({ pontos: 55 }),
            })
            .mockRejectedValueOnce(
                new ErroAplicacao("Missao ja concluida neste periodo", 409),
            );

        const token = { tokenQr: missaoFake().tokenQr };
        const agora = meioDiaSp(2026, 8, 17);
        const [a, b] = await Promise.allSettled([
            servico.concluirPorToken(30, token, agora),
            servico.concluirPorToken(30, token, agora),
        ]);

        expect(a.status === "fulfilled" || b.status === "fulfilled").toBe(true);
        const rejeitado = a.status === "rejected" ? a : b;
        expect(rejeitado.status).toBe("rejected");
        expect((rejeitado as PromiseRejectedResult).reason).toMatchObject({
            statusCode: 409,
        });
    });

    it("historico pode ter varias linhas da mesma missao em periodos diferentes", async () => {
        repositorioMissaoConsumidorMock.listarPorConsumidorId.mockResolvedValue([
            vinculoFake("2026-08-18"),
            vinculoFake("2026-08-17"),
        ]);
        const lista = await servico.listar(30);
        expect(lista).toHaveLength(2);
        expect(lista.map((item) => item.chavePeriodo)).toEqual([
            "2026-08-18",
            "2026-08-17",
        ]);
    });

    it("Visitar loja: primeiro scan do dia credita 5; segundo 409; dia seguinte passa", async () => {
        const missao = missaoFake({
            sistema: true,
            frequencia: FrequenciaMissao.DIARIA,
            pontoRecompensa: 5,
            dataFim: null,
        });
        await concluir(missao, meioDiaSp(2026, 8, 17));
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledWith(
            expect.objectContaining({ chavePeriodo: "2026-08-17", pontoRecompensa: 5 }),
        );

        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(
            vinculoFake("2026-08-17"),
        );
        await expect(
            servico.concluirPorToken(30, { tokenQr: missao.tokenQr }, meioDiaSp(2026, 8, 17)),
        ).rejects.toMatchObject({ statusCode: 409 });

        repositorioMissaoConsumidorMock.buscarPorMissaoConsumidorPeriodo.mockResolvedValue(null);
        await concluir(missao, meioDiaSp(2026, 8, 18));
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenLastCalledWith(
            expect.objectContaining({ chavePeriodo: "2026-08-18", pontoRecompensa: 5 }),
        );
    });

    it("PENDENTE nao concede pontos ao escanear Visitar loja", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 1 }),
        );
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(
            missaoFake({ sistema: true, frequencia: FrequenciaMissao.DIARIA, dataFim: null }),
        );
        await expect(
            servico.concluirPorToken(30, { tokenQr: missaoFake().tokenQr }),
        ).rejects.toMatchObject({ message: "Loja nao aprovada", statusCode: 403 });
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("REJEITADO nao concede pontos ao escanear Visitar loja", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO, id: 1 }),
        );
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(
            missaoFake({ sistema: true, frequencia: FrequenciaMissao.DIARIA, dataFim: null }),
        );
        await expect(
            servico.concluirPorToken(30, { tokenQr: missaoFake().tokenQr }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioMissaoConsumidorMock.concluirComPontos).not.toHaveBeenCalled();
    });

    it("consumidor com lojistaId legado de outra loja conclui missao normal da loja B", async () => {
        repositorioConsumidorMock.buscarPorUsuarioId.mockResolvedValue(
            consumidorFake({ lojistaId: 99, pontos: 200, nivel: 3 }),
        );
        const missao = missaoFake({ lojistaId: 2, sistema: false, pontoRecompensa: 50 });
        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValue(missao);
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 2 }),
        );
        repositorioMissaoConsumidorMock.concluirComPontos.mockResolvedValue({
            missaoConsumidor: vinculoFake(),
            consumidor: consumidorFake({ lojistaId: 99, pontos: 250, nivel: 3 }),
        });

        const resultado = await servico.concluirPorToken(
            30,
            { tokenQr: missao.tokenQr },
            meioDiaSp(2026, 8, 17),
        );

        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalled();
        expect(resultado.consumidor.pontos).toBe(250);
        expect(resultado.consumidor.lojistaId).toBe(99);
    });

    it("missao A + missao B creditam o mesmo saldo global", async () => {
        repositorioConsumidorMock.buscarPorUsuarioId.mockResolvedValue(
            consumidorFake({ lojistaId: null, pontos: 200, nivel: 3 }),
        );
        const missaoA = missaoFake({
            id: 8,
            lojistaId: 1,
            sistema: true,
            frequencia: FrequenciaMissao.DIARIA,
            pontoRecompensa: 5,
            dataFim: null,
        });
        const missaoB = missaoFake({
            id: 9,
            lojistaId: 2,
            sistema: false,
            pontoRecompensa: 50,
        });

        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValueOnce(missaoA);
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 1 }),
        );
        repositorioMissaoConsumidorMock.concluirComPontos.mockResolvedValueOnce({
            missaoConsumidor: vinculoFake(),
            consumidor: consumidorFake({ lojistaId: null, pontos: 205, nivel: 3 }),
        });
        const primeira = await servico.concluirPorToken(
            30,
            { tokenQr: missaoA.tokenQr },
            meioDiaSp(2026, 8, 17),
        );

        repositorioMissaoMock.buscarPorTokenQr.mockResolvedValueOnce(missaoB);
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 2 }),
        );
        repositorioMissaoConsumidorMock.concluirComPontos.mockResolvedValueOnce({
            missaoConsumidor: vinculoFake(),
            consumidor: consumidorFake({ lojistaId: null, pontos: 255, nivel: 3 }),
        });
        const segunda = await servico.concluirPorToken(
            30,
            { tokenQr: missaoB.tokenQr },
            meioDiaSp(2026, 8, 17),
        );

        expect(primeira.consumidor.pontos).toBe(205);
        expect(segunda.consumidor.pontos).toBe(255);
        expect(repositorioMissaoConsumidorMock.concluirComPontos).toHaveBeenCalledTimes(2);
    });
});
