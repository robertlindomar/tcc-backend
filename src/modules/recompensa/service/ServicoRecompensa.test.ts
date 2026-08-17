import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista, StatusResgateRecompensa } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { fimDoDiaCivilNoFuso, instanteCivilNoFuso } from "../../../shared/tempo/fusoNegocio";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Recompensa } from "../model/Recompensa";
import { ResgateRecompensa } from "../model/ResgateRecompensa";
import { RepositorioRecompensa } from "../repository/RepositorioRecompensa";
import { RepositorioResgateRecompensa } from "../repository/RepositorioResgateRecompensa";
import { ServicoRecompensa } from "./ServicoRecompensa";

function recompensaFake(overrides?: Partial<{
    id: number;
    custoPontos: number;
    ativa: boolean;
    lojistaId: number;
    nome: string;
    estoque: number | null;
    dataFim: Date | null;
    nomeLoja: string | null;
}>): Recompensa {
    const agora = new Date();
    return new Recompensa({
        id: overrides?.id ?? 3,
        nome: overrides?.nome ?? "Chaveiro da loja",
        descricao: null,
        custoPontos: overrides?.custoPontos ?? 50,
        ativa: overrides?.ativa ?? true,
        estoque: overrides?.estoque === undefined ? 10 : overrides.estoque,
        dataFim: overrides?.dataFim === undefined ? null : overrides.dataFim,
        lojistaId: overrides?.lojistaId ?? 5,
        nomeLoja: overrides?.nomeLoja ?? null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function consumidorFake(overrides?: Partial<{
    id: number;
    pontos: number;
    nivel: number;
    usuarioId: number;
    lojistaId: number | null;
}>): Consumidor {
    const agora = new Date();
    return new Consumidor({
        id: overrides?.id ?? 9,
        cpf: "222.333.444-55",
        pontos: overrides?.pontos ?? 200,
        nivel: overrides?.nivel ?? 3,
        sexoId: null,
        lojistaId: overrides?.lojistaId === undefined ? null : overrides.lojistaId,
        usuarioId: overrides?.usuarioId ?? 30,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function resgateFake(overrides?: Partial<{
    status: StatusResgateRecompensa;
    dataEntrega: Date | null;
    nomeConsumidor: string | null;
}>): ResgateRecompensa {
    return new ResgateRecompensa({
        id: 1,
        recompensaId: 3,
        consumidorId: 9,
        custoPontosSnapshot: 50,
        nomeRecompensaSnapshot: "Chaveiro da loja",
        status: overrides?.status ?? StatusResgateRecompensa.PENDENTE_ENTREGA,
        dataEntrega: overrides?.dataEntrega === undefined ? null : overrides.dataEntrega,
        dataCriacao: new Date("2026-08-17T12:00:00.000Z"),
        nomeConsumidor: overrides?.nomeConsumidor ?? "Bruno Lima",
    });
}

describe("ServicoRecompensa CRUD", () => {
    let repoRecompensa: {
        criar: ReturnType<typeof vi.fn>;
        listarPorLojistaId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };
    let repoLojista: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoRecompensa;

    beforeEach(() => {
        repoRecompensa = {
            criar: vi.fn(),
            listarPorLojistaId: vi.fn().mockResolvedValue([]),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
        repoLojista = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(
                lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
            ),
        };
        servico = new ServicoRecompensa(
            repoRecompensa as unknown as RepositorioRecompensa,
            {} as RepositorioResgateRecompensa,
            repoLojista as unknown as RepositorioLojista,
            {} as RepositorioConsumidor,
        );
    });

    it("criar com custo 0 retorna 400", async () => {
        await expect(
            servico.criar(20, { nome: "Brinde", custoPontos: 0 }),
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(repoRecompensa.criar).not.toHaveBeenCalled();
    });

    it("criar com estoque negativo retorna 400", async () => {
        await expect(
            servico.criar(20, { nome: "Brinde", custoPontos: 50, estoque: -1 }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("criar sem estoque persiste null (ilimitado)", async () => {
        repoRecompensa.criar.mockResolvedValue(recompensaFake({ estoque: null }));
        await servico.criar(20, { nome: "Cupom 10%", custoPontos: 100 });
        expect(repoRecompensa.criar).toHaveBeenCalledWith(
            expect.objectContaining({ estoque: null, dataFim: null, lojistaId: 5 }),
        );
    });

    it("YYYY-MM-DD vira fim do dia civil no FUSO_NEGOCIO", async () => {
        repoRecompensa.criar.mockResolvedValue(
            recompensaFake({ dataFim: fimDoDiaCivilNoFuso({ ano: 2026, mes: 8, dia: 17 }) }),
        );
        await servico.criar(20, {
            nome: "Cupom 10%",
            custoPontos: 100,
            dataFim: "2026-08-17",
        });
        expect(repoRecompensa.criar).toHaveBeenCalledWith(
            expect.objectContaining({
                dataFim: fimDoDiaCivilNoFuso({ ano: 2026, mes: 8, dia: 17 }),
            }),
        );
    });

    it("atualizar estoque negativo retorna 400", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake());
        await expect(
            servico.atualizar(20, "3", { estoque: -1 }),
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(repoRecompensa.atualizar).not.toHaveBeenCalled();
    });

    it("criar com estoque 0 e valido (esgotada)", async () => {
        repoRecompensa.criar.mockResolvedValue(recompensaFake({ estoque: 0 }));
        const resultado = await servico.criar(20, {
            nome: "Chaveiro da loja",
            custoPontos: 50,
            estoque: 0,
        });
        expect(repoRecompensa.criar).toHaveBeenCalledWith(
            expect.objectContaining({ estoque: 0 }),
        );
        expect(resultado.situacao).toBe("ESGOTADA");
    });

    it("criar valido persiste custoPontos e ignora lojistaId do body", async () => {
        repoRecompensa.criar.mockResolvedValue(recompensaFake({ custoPontos: 50 }));
        const resultado = await servico.criar(20, {
            nome: "Chaveiro da loja",
            custoPontos: 50,
            estoque: 10,
            lojistaId: 999,
        } as never);
        expect(repoRecompensa.criar).toHaveBeenCalledWith({
            nome: "Chaveiro da loja",
            descricao: null,
            custoPontos: 50,
            estoque: 10,
            dataFim: null,
            lojistaId: 5,
        });
        expect(resultado.custoPontos).toBe(50);
        expect(resultado.lojistaId).toBe(5);
        expect(resultado.situacao).toBe("DISPONIVEL");
    });

    it("cross-tenant buscar retorna 404", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake({ lojistaId: 99 }));
        await expect(servico.buscar(20, "3")).rejects.toMatchObject({
            statusCode: 404,
            message: "Recompensa nao encontrada",
        });
    });

    it("desativar torna ativa=false", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake({ ativa: true }));
        repoRecompensa.atualizar.mockResolvedValue(recompensaFake({ ativa: false }));
        const resultado = await servico.desativar(20, "3");
        expect(repoRecompensa.atualizar).toHaveBeenCalledWith(3, { ativa: false });
        expect(resultado.ativa).toBe(false);
        expect(resultado.situacao).toBe("DESATIVADA");
    });

    it("desativar repetido e idempotente", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake({ ativa: false }));
        const resultado = await servico.desativar(20, "3");
        expect(repoRecompensa.atualizar).not.toHaveBeenCalled();
        expect(resultado.ativa).toBe(false);
    });
});

describe("ServicoRecompensa por status do lojista", () => {
    it("PENDENTE nao cria", async () => {
        const servico = new ServicoRecompensa(
            { criar: vi.fn() } as unknown as RepositorioRecompensa,
            {} as RepositorioResgateRecompensa,
            {
                buscarPorUsuarioId: vi.fn().mockResolvedValue(
                    lojistaFake({ status: StatusLojista.PENDENTE }),
                ),
            } as unknown as RepositorioLojista,
            {} as RepositorioConsumidor,
        );
        await expect(
            servico.criar(20, { nome: "X", custoPontos: 10 }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("REJEITADO nao cria", async () => {
        const servico = new ServicoRecompensa(
            { criar: vi.fn() } as unknown as RepositorioRecompensa,
            {} as RepositorioResgateRecompensa,
            {
                buscarPorUsuarioId: vi.fn().mockResolvedValue(
                    lojistaFake({ status: StatusLojista.REJEITADO }),
                ),
            } as unknown as RepositorioLojista,
            {} as RepositorioConsumidor,
        );
        await expect(
            servico.criar(20, { nome: "X", custoPontos: 10 }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

describe("ServicoRecompensa resgate", () => {
    let repoRecompensa: {
        buscar: ReturnType<typeof vi.fn>;
        listarCatalogoAprovado: ReturnType<typeof vi.fn>;
    };
    let repoResgate: {
        resgatarComDebito: ReturnType<typeof vi.fn>;
        listarPorConsumidorId: ReturnType<typeof vi.fn>;
        confirmarEntrega: ReturnType<typeof vi.fn>;
        listarPorLojistaId: ReturnType<typeof vi.fn>;
    };
    let repoConsumidor: {
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let repoLojista: { buscarPorUsuarioId: ReturnType<typeof vi.fn>; buscar: ReturnType<typeof vi.fn> };
    let servico: ServicoRecompensa;

    beforeEach(() => {
        repoRecompensa = { buscar: vi.fn(), listarCatalogoAprovado: vi.fn() };
        repoResgate = {
            resgatarComDebito: vi.fn(),
            listarPorConsumidorId: vi.fn(),
            confirmarEntrega: vi.fn(),
            listarPorLojistaId: vi.fn(),
        };
        repoConsumidor = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(consumidorFake()),
            buscar: vi.fn().mockResolvedValue(consumidorFake()),
        };
        repoLojista = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(
                lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
            ),
            buscar: vi.fn(),
        };
        servico = new ServicoRecompensa(
            repoRecompensa as unknown as RepositorioRecompensa,
            repoResgate as unknown as RepositorioResgateRecompensa,
            repoLojista as unknown as RepositorioLojista,
            repoConsumidor as unknown as RepositorioConsumidor,
        );
    });

    it("200 pontos e recompensa 50 resulta saldo 150 e snapshot 50", async () => {
        repoResgate.resgatarComDebito.mockResolvedValue({
            resgate: resgateFake(),
            consumidor: consumidorFake({ pontos: 150, nivel: 2 }),
        });

        const resultado = await servico.resgatar(30, "3", {
            consumidorId: 999,
            custoPontos: 1,
            estoque: 99,
        });

        expect(repoResgate.resgatarComDebito).toHaveBeenCalledWith({
            recompensaId: 3,
            consumidorId: 9,
            agora: expect.any(Date),
        });
        expect(resultado.consumidor.pontos).toBe(150);
        expect(resultado.resgate.custoPontosSnapshot).toBe(50);
        expect(resultado.resgate.status).toBe(StatusResgateRecompensa.PENDENTE_ENTREGA);
        expect(resultado.resgate.dataEntrega).toBeNull();
    });

    it("saldo exato 50 resgata 50 e fica 0", async () => {
        repoResgate.resgatarComDebito.mockResolvedValue({
            resgate: resgateFake(),
            consumidor: consumidorFake({ pontos: 0, nivel: 1 }),
        });
        const resultado = await servico.resgatar(30, "3", {});
        expect(resultado.consumidor.pontos).toBe(0);
    });

    it("pontos insuficientes nao chama debito se o repositorio recusar", async () => {
        repoResgate.resgatarComDebito.mockRejectedValue(
            new ErroAplicacao("Pontos insuficientes", 400),
        );
        await expect(servico.resgatar(30, "3", {})).rejects.toMatchObject({
            statusCode: 400,
            message: "Pontos insuficientes",
        });
    });

    it("recompensa desativada nao resgata", async () => {
        repoResgate.resgatarComDebito.mockRejectedValue(
            new ErroAplicacao("Recompensa nao disponivel", 400),
        );
        await expect(servico.resgatar(30, "3", {})).rejects.toMatchObject({
            statusCode: 400,
            message: "Recompensa nao disponivel",
        });
    });

    it("estoque null permite dois resgates", async () => {
        repoResgate.resgatarComDebito
            .mockResolvedValueOnce({
                resgate: resgateFake(),
                consumidor: consumidorFake({ pontos: 150 }),
            })
            .mockResolvedValueOnce({
                resgate: resgateFake(),
                consumidor: consumidorFake({ pontos: 100 }),
            });
        await servico.resgatar(30, "3", {});
        await servico.resgatar(31, "3", {});
        expect(repoResgate.resgatarComDebito).toHaveBeenCalledTimes(2);
    });

    it("estoque 0 nao resgata", async () => {
        repoResgate.resgatarComDebito.mockRejectedValue(
            new ErroAplicacao("Recompensa esgotada", 400),
        );
        await expect(servico.resgatar(30, "3", {})).rejects.toMatchObject({
            statusCode: 400,
            message: "Recompensa esgotada",
        });
    });

    it("expirada nao resgata", async () => {
        const agora = instanteCivilNoFuso({
            ano: 2026,
            mes: 8,
            dia: 18,
            hora: 0,
            minuto: 0,
            segundo: 1,
        });
        repoResgate.resgatarComDebito.mockRejectedValue(
            new ErroAplicacao("Recompensa expirada", 400),
        );
        await expect(servico.resgatar(30, "3", {}, agora)).rejects.toMatchObject({
            statusCode: 400,
            message: "Recompensa expirada",
        });
    });

    it("loja nao aprovada nao resgata", async () => {
        repoResgate.resgatarComDebito.mockRejectedValue(
            new ErroAplicacao("Loja nao aprovada", 403),
        );
        await expect(servico.resgatar(30, "3", {})).rejects.toMatchObject({
            statusCode: 403,
            message: "Loja nao aprovada",
        });
    });

    it("concorrencia de pontos: uma conclusao e uma falha", async () => {
        repoResgate.resgatarComDebito
            .mockResolvedValueOnce({
                resgate: resgateFake(),
                consumidor: consumidorFake({ pontos: 0 }),
            })
            .mockRejectedValueOnce(new ErroAplicacao("Pontos insuficientes", 400));

        const [a, b] = await Promise.allSettled([
            servico.resgatar(30, "3", {}),
            servico.resgatar(30, "3", {}),
        ]);
        expect(a.status === "fulfilled" || b.status === "fulfilled").toBe(true);
        const rejeitado = a.status === "rejected" ? a : b;
        expect(rejeitado.status).toBe("rejected");
        expect((rejeitado as PromiseRejectedResult).reason).toMatchObject({
            statusCode: 400,
        });
    });

    it("concorrencia de estoque 1: um PASS e um FAIL", async () => {
        repoResgate.resgatarComDebito
            .mockResolvedValueOnce({
                resgate: resgateFake(),
                consumidor: consumidorFake({ pontos: 150 }),
            })
            .mockRejectedValueOnce(new ErroAplicacao("Recompensa esgotada", 400));

        const [a, b] = await Promise.allSettled([
            servico.resgatar(30, "3", {}),
            servico.resgatar(31, "3", {}),
        ]);
        const ok = [a, b].filter((item) => item.status === "fulfilled");
        const fail = [a, b].filter((item) => item.status === "rejected");
        expect(ok).toHaveLength(1);
        expect(fail).toHaveLength(1);
        expect((fail[0] as PromiseRejectedResult).reason).toMatchObject({
            message: "Recompensa esgotada",
        });
    });

    it("catalogo lista recompensas de lojas APROVADAS sem filtrar por Consumidor.lojistaId", async () => {
        repoConsumidor.buscar.mockResolvedValue(consumidorFake({ lojistaId: null }));
        repoRecompensa.listarCatalogoAprovado.mockResolvedValue([
            recompensaFake({ id: 3, lojistaId: 5, nomeLoja: "Casa do Real" }),
            recompensaFake({ id: 4, lojistaId: 8, nome: "Outra loja", nomeLoja: "Outra" }),
        ]);

        const catalogo = await servico.catalogoConsumidor(30);

        expect(repoRecompensa.listarCatalogoAprovado).toHaveBeenCalled();
        expect(catalogo.recompensas).toHaveLength(2);
        expect(catalogo.recompensas.map((item) => item.lojistaId)).toEqual([5, 8]);
        expect(catalogo.recompensas[0].nomeLoja).toBe("Casa do Real");
        expect(catalogo.recompensas[0].situacao).toBe("DISPONIVEL");
    });

    it("validade no limite agora == dataFim continua disponivel", () => {
        const fim = fimDoDiaCivilNoFuso({ ano: 2026, mes: 8, dia: 17 });
        const resultado = servico["paraResposta"](
            recompensaFake({ dataFim: fim, estoque: null }),
            fim,
        );
        expect(resultado.situacao).toBe("DISPONIVEL");
    });
});

describe("ServicoRecompensa entrega", () => {
    let repoResgate: {
        confirmarEntrega: ReturnType<typeof vi.fn>;
        listarPorLojistaId: ReturnType<typeof vi.fn>;
        resgatarComDebito: ReturnType<typeof vi.fn>;
        listarPorConsumidorId: ReturnType<typeof vi.fn>;
    };
    let repoLojista: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoRecompensa;

    beforeEach(() => {
        repoResgate = {
            confirmarEntrega: vi.fn(),
            listarPorLojistaId: vi.fn(),
            resgatarComDebito: vi.fn(),
            listarPorConsumidorId: vi.fn(),
        };
        repoLojista = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(
                lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
            ),
        };
        servico = new ServicoRecompensa(
            {} as RepositorioRecompensa,
            repoResgate as unknown as RepositorioResgateRecompensa,
            repoLojista as unknown as RepositorioLojista,
            {
                buscarPorUsuarioId: vi.fn(),
            } as unknown as RepositorioConsumidor,
        );
    });

    it("lojista dono confirma PENDENTE_ENTREGA para ENTREGUE", async () => {
        const agora = new Date("2026-08-17T18:00:00.000Z");
        repoResgate.confirmarEntrega.mockResolvedValue(
            resgateFake({
                status: StatusResgateRecompensa.ENTREGUE,
                dataEntrega: agora,
            }),
        );

        const resultado = await servico.confirmarEntrega(20, "1", agora);

        expect(repoResgate.confirmarEntrega).toHaveBeenCalledWith({
            resgateId: 1,
            lojistaId: 5,
            agora,
        });
        expect(resultado.status).toBe(StatusResgateRecompensa.ENTREGUE);
        expect(resultado.dataEntrega).toEqual(agora);
        expect(resultado.nomeConsumidor).toBe("Bruno Lima");
        expect(resultado).not.toHaveProperty("cpf");
    });

    it("confirmar de novo e idempotente", async () => {
        const entrega = new Date("2026-08-17T18:00:00.000Z");
        repoResgate.confirmarEntrega.mockResolvedValue(
            resgateFake({
                status: StatusResgateRecompensa.ENTREGUE,
                dataEntrega: entrega,
            }),
        );
        const resultado = await servico.confirmarEntrega(20, "1");
        expect(resultado.status).toBe(StatusResgateRecompensa.ENTREGUE);
        expect(resultado.dataEntrega).toEqual(entrega);
    });

    it("outro lojista recebe 404", async () => {
        repoResgate.confirmarEntrega.mockRejectedValue(
            new ErroAplicacao("Resgate nao encontrado", 404),
        );
        await expect(servico.confirmarEntrega(20, "1")).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    it("PENDENTE nao lista nem confirma", async () => {
        repoLojista.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5 }),
        );
        await expect(servico.confirmarEntrega(20, "1")).rejects.toMatchObject({
            statusCode: 403,
        });
        await expect(servico.listarResgatesLoja(20)).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repoResgate.confirmarEntrega).not.toHaveBeenCalled();
    });

    it("REJEITADO nao confirma", async () => {
        repoLojista.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO, id: 5 }),
        );
        await expect(servico.confirmarEntrega(20, "1")).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repoResgate.confirmarEntrega).not.toHaveBeenCalled();
    });
});
