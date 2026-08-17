import { describe, expect, it } from "vitest";
import { StatusLojista, StatusResgateRecompensa } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioResgateRecompensa } from "./RepositorioResgateRecompensa";

describe("RepositorioResgateRecompensa.resgatarComDebito", () => {
    it("trava recompensa, depois consumidor, reduz estoque, debita pontos e cria PENDENTE_ENTREGA", async () => {
        const ordem: string[] = [];
        const prisma = {
            $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    $executeRaw: async (strings: TemplateStringsArray) => {
                        const sql = strings.join(" ");
                        if (sql.includes("recompensa")) {
                            ordem.push("lock-recompensa");
                        }
                        if (sql.includes("consumidor") && !sql.includes("recompensa")) {
                            ordem.push("lock-consumidor");
                        }
                    },
                    recompensa: {
                        findUnique: async () => {
                            ordem.push("load-recompensa");
                            return {
                                id: 3,
                                nome: "Chaveiro da loja",
                                custoPontos: 50,
                                ativa: true,
                                estoque: 1,
                                dataFim: null,
                                lojistaId: 5,
                            };
                        },
                        updateMany: async () => {
                            ordem.push("dec-estoque");
                            return { count: 1 };
                        },
                    },
                    lojista: {
                        findUnique: async () => ({
                            id: 5,
                            status: StatusLojista.APROVADO,
                        }),
                    },
                    consumidor: {
                        findUnique: async () => {
                            ordem.push("load-consumidor");
                            return {
                                id: 9,
                                cpf: "222.333.444-55",
                                pontos: ordem.includes("debito") ? 0 : 50,
                                nivel: 1,
                                sexoId: null,
                                lojistaId: null,
                                usuarioId: 30,
                                dataCriacao: new Date(),
                                dataAtualizacao: new Date(),
                            };
                        },
                        updateMany: async () => {
                            ordem.push("debito");
                            return { count: 1 };
                        },
                        update: async () => {
                            ordem.push("nivel");
                            return {
                                id: 9,
                                cpf: "222.333.444-55",
                                pontos: 0,
                                nivel: 1,
                                sexoId: null,
                                lojistaId: null,
                                usuarioId: 30,
                                dataCriacao: new Date(),
                                dataAtualizacao: new Date(),
                            };
                        },
                    },
                    resgateRecompensa: {
                        create: async (args: { data: { status: string; dataEntrega: Date | null } }) => {
                            ordem.push("create-resgate");
                            expect(args.data.status).toBe(StatusResgateRecompensa.PENDENTE_ENTREGA);
                            expect(args.data.dataEntrega).toBeNull();
                            return {
                                id: 1,
                                recompensaId: 3,
                                consumidorId: 9,
                                custoPontosSnapshot: 50,
                                nomeRecompensaSnapshot: "Chaveiro da loja",
                                status: StatusResgateRecompensa.PENDENTE_ENTREGA,
                                dataEntrega: null,
                                dataCriacao: new Date(),
                            };
                        },
                    },
                }),
        };

        const repo = new RepositorioResgateRecompensa(prisma as never);
        const resultado = await repo.resgatarComDebito({
            recompensaId: 3,
            consumidorId: 9,
        });

        expect(ordem[0]).toBe("lock-recompensa");
        expect(ordem.indexOf("lock-consumidor")).toBeGreaterThan(ordem.indexOf("lock-recompensa"));
        expect(ordem.indexOf("dec-estoque")).toBeGreaterThan(ordem.indexOf("lock-consumidor"));
        expect(ordem.indexOf("debito")).toBeGreaterThan(ordem.indexOf("dec-estoque"));
        expect(ordem.indexOf("create-resgate")).toBeGreaterThan(ordem.indexOf("debito"));
        expect(resultado.resgate.status).toBe(StatusResgateRecompensa.PENDENTE_ENTREGA);
        expect(resultado.consumidor.pontos).toBe(0);
    });

    it("estoque 1: segundo updateMany 0 vira esgotada e nao deixa credito orfao", async () => {
        const prisma = {
            $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    $executeRaw: async () => undefined,
                    recompensa: {
                        findUnique: async () => ({
                            id: 3,
                            nome: "Chaveiro",
                            custoPontos: 50,
                            ativa: true,
                            estoque: 1,
                            dataFim: null,
                            lojistaId: 5,
                        }),
                        updateMany: async () => ({ count: 0 }),
                    },
                    lojista: {
                        findUnique: async () => ({ id: 5, status: StatusLojista.APROVADO }),
                    },
                    consumidor: {
                        findUnique: async () => ({
                            id: 9,
                            pontos: 50,
                            nivel: 1,
                            cpf: "1",
                            sexoId: null,
                            lojistaId: null,
                            usuarioId: 30,
                            dataCriacao: new Date(),
                            dataAtualizacao: new Date(),
                        }),
                        updateMany: async () => {
                            throw new Error("nao deve debitar se estoque falhou");
                        },
                    },
                    resgateRecompensa: {
                        create: async () => {
                            throw new Error("nao deve criar resgate");
                        },
                    },
                }),
        };

        const repo = new RepositorioResgateRecompensa(prisma as never);
        await expect(
            repo.resgatarComDebito({ recompensaId: 3, consumidorId: 9 }),
        ).rejects.toMatchObject({
            message: "Recompensa esgotada",
            statusCode: 400,
        } satisfies Partial<ErroAplicacao>);
    });
});

describe("RepositorioResgateRecompensa.confirmarEntrega", () => {
    it("idempotente: ENTREGUE nao altera pontos nem estoque", async () => {
        const agora = new Date("2026-08-17T18:00:00.000Z");
        const prisma = {
            $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    $executeRaw: async () => undefined,
                    resgateRecompensa: {
                        findUnique: async () => ({
                            id: 1,
                            recompensaId: 3,
                            consumidorId: 9,
                            custoPontosSnapshot: 50,
                            nomeRecompensaSnapshot: "Chaveiro da loja",
                            status: StatusResgateRecompensa.ENTREGUE,
                            dataEntrega: agora,
                            dataCriacao: agora,
                            recompensa: { lojistaId: 5 },
                            consumidor: { usuario: { nome: "Bruno Lima" } },
                        }),
                        update: async () => {
                            throw new Error("nao deve atualizar resgate ja entregue");
                        },
                    },
                    recompensa: {
                        update: async () => {
                            throw new Error("nao deve mexer estoque");
                        },
                        updateMany: async () => {
                            throw new Error("nao deve mexer estoque");
                        },
                    },
                    consumidor: {
                        update: async () => {
                            throw new Error("nao deve mexer pontos");
                        },
                        updateMany: async () => {
                            throw new Error("nao deve mexer pontos");
                        },
                    },
                }),
        };

        const repo = new RepositorioResgateRecompensa(prisma as never);
        const resultado = await repo.confirmarEntrega({
            resgateId: 1,
            lojistaId: 5,
            agora,
        });
        expect(resultado.status).toBe(StatusResgateRecompensa.ENTREGUE);
        expect(resultado.dataEntrega).toEqual(agora);
    });

    it("outro lojista recebe 404", async () => {
        const prisma = {
            $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    $executeRaw: async () => undefined,
                    resgateRecompensa: {
                        findUnique: async () => ({
                            id: 1,
                            recompensa: { lojistaId: 5 },
                            status: StatusResgateRecompensa.PENDENTE_ENTREGA,
                        }),
                    },
                }),
        };
        const repo = new RepositorioResgateRecompensa(prisma as never);
        await expect(
            repo.confirmarEntrega({ resgateId: 1, lojistaId: 99 }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});
