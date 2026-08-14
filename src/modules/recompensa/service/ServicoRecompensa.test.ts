import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
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
}>): Recompensa {
    const agora = new Date();
    return new Recompensa({
        id: overrides?.id ?? 3,
        nome: overrides?.nome ?? "Chaveiro da loja",
        descricao: null,
        custoPontos: overrides?.custoPontos ?? 50,
        ativa: overrides?.ativa ?? true,
        lojistaId: overrides?.lojistaId ?? 5,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function consumidorFake(overrides?: Partial<{
    id: number;
    pontos: number;
    nivel: number;
    usuarioId: number;
}>): Consumidor {
    const agora = new Date();
    return new Consumidor({
        id: overrides?.id ?? 9,
        cpf: "222.333.444-55",
        pontos: overrides?.pontos ?? 200,
        nivel: overrides?.nivel ?? 3,
        sexoId: null,
        lojistaId: 5,
        usuarioId: overrides?.usuarioId ?? 30,
        dataCriacao: agora,
        dataAtualizacao: agora,
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

    it("criar com custo negativo retorna 400", async () => {
        await expect(
            servico.criar(20, { nome: "Brinde", custoPontos: -1 }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("criar sem custo retorna 400", async () => {
        await expect(
            servico.criar(20, { nome: "Brinde" } as never),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("criar valido persiste custoPontos e ignora lojistaId do body", async () => {
        repoRecompensa.criar.mockResolvedValue(recompensaFake({ custoPontos: 50 }));
        const resultado = await servico.criar(20, {
            nome: "Chaveiro da loja",
            custoPontos: 50,
            lojistaId: 999,
        } as never);
        expect(repoRecompensa.criar).toHaveBeenCalledWith({
            nome: "Chaveiro da loja",
            descricao: null,
            custoPontos: 50,
            lojistaId: 5,
        });
        expect(resultado.custoPontos).toBe(50);
        expect(resultado.lojistaId).toBe(5);
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
    let repoRecompensa: { buscar: ReturnType<typeof vi.fn>; listarAtivas: ReturnType<typeof vi.fn> };
    let repoResgate: {
        resgatarComDebito: ReturnType<typeof vi.fn>;
        listarPorConsumidorId: ReturnType<typeof vi.fn>;
    };
    let repoConsumidor: {
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoRecompensa;

    beforeEach(() => {
        repoRecompensa = { buscar: vi.fn(), listarAtivas: vi.fn() };
        repoResgate = {
            resgatarComDebito: vi.fn(),
            listarPorConsumidorId: vi.fn(),
        };
        repoConsumidor = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(consumidorFake()),
            buscar: vi.fn().mockResolvedValue(consumidorFake()),
        };
        servico = new ServicoRecompensa(
            repoRecompensa as unknown as RepositorioRecompensa,
            repoResgate as unknown as RepositorioResgateRecompensa,
            {} as RepositorioLojista,
            repoConsumidor as unknown as RepositorioConsumidor,
        );
    });

    it("200 pontos e recompensa 50 resulta saldo 150 e snapshot 50", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake({ custoPontos: 50 }));
        repoResgate.resgatarComDebito.mockResolvedValue({
            resgate: new ResgateRecompensa({
                id: 1,
                recompensaId: 3,
                consumidorId: 9,
                custoPontosSnapshot: 50,
                nomeRecompensaSnapshot: "Chaveiro da loja",
                dataCriacao: new Date(),
            }),
            consumidor: consumidorFake({ pontos: 150, nivel: 2 }),
        });

        const resultado = await servico.resgatar(30, "3", {
            consumidorId: 999,
            custoPontos: 1,
        });

        expect(repoResgate.resgatarComDebito).toHaveBeenCalledWith({
            recompensaId: 3,
            consumidorId: 9,
            custoPontos: 50,
            nomeRecompensa: "Chaveiro da loja",
        });
        expect(resultado.consumidor.pontos).toBe(150);
        expect(resultado.resgate.custoPontosSnapshot).toBe(50);
    });

    it("saldo exato 50 resgata 50 e fica 0", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake({ custoPontos: 50 }));
        repoResgate.resgatarComDebito.mockResolvedValue({
            resgate: new ResgateRecompensa({
                id: 1,
                recompensaId: 3,
                consumidorId: 9,
                custoPontosSnapshot: 50,
                nomeRecompensaSnapshot: "Chaveiro da loja",
                dataCriacao: new Date(),
            }),
            consumidor: consumidorFake({ pontos: 0, nivel: 1 }),
        });
        const resultado = await servico.resgatar(30, "3", {});
        expect(resultado.consumidor.pontos).toBe(0);
    });

    it("pontos insuficientes nao chama debito se o repositorio recusar", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake({ custoPontos: 50 }));
        repoResgate.resgatarComDebito.mockRejectedValue(
            new ErroAplicacao("Pontos insuficientes", 400),
        );
        await expect(servico.resgatar(30, "3", {})).rejects.toMatchObject({
            statusCode: 400,
            message: "Pontos insuficientes",
        });
    });

    it("recompensa desativada nao resgata", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake({ ativa: false }));
        await expect(servico.resgatar(30, "3", {})).rejects.toMatchObject({
            statusCode: 400,
            message: "Recompensa nao disponivel",
        });
        expect(repoResgate.resgatarComDebito).not.toHaveBeenCalled();
    });

    it("concorrencia: uma conclusao e uma falha", async () => {
        repoRecompensa.buscar.mockResolvedValue(recompensaFake({ custoPontos: 50 }));
        repoResgate.resgatarComDebito
            .mockResolvedValueOnce({
                resgate: new ResgateRecompensa({
                    id: 1,
                    recompensaId: 3,
                    consumidorId: 9,
                    custoPontosSnapshot: 50,
                    nomeRecompensaSnapshot: "Chaveiro da loja",
                    dataCriacao: new Date(),
                }),
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
});
