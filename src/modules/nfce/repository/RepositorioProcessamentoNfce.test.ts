import { describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioProcessamentoNfce } from "./RepositorioProcessamentoNfce";

describe("RepositorioProcessamentoNfce.processarComCredito", () => {
    it("trava residual, cria processamento e soma tickets (R$55 / R$10 → 5 + R$5)", async () => {
        const ordem: string[] = [];
        const prisma = {
            $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    residualTicketCampanha: {
                        createMany: async () => {
                            ordem.push("ensure-residual");
                            return { count: 1 };
                        },
                        findUnique: async () => {
                            ordem.push("load-residual");
                            return {
                                id: 7,
                                consumidorId: 9,
                                campanhaId: 1,
                                valorResidual: 0,
                                ticketsTotais: 0,
                            };
                        },
                        update: async (args: {
                            data: { valorResidual: number; ticketsTotais: { increment: number } };
                        }) => {
                            ordem.push("update-residual");
                            expect(args.data.valorResidual).toBe(5);
                            expect(args.data.ticketsTotais.increment).toBe(5);
                            return {
                                id: 7,
                                ticketsTotais: 5,
                                valorResidual: 5,
                            };
                        },
                    },
                    $executeRaw: async () => {
                        ordem.push("lock-residual");
                    },
                    processamentoNfce: {
                        create: async (args: {
                            data: {
                                chaveAcesso: string;
                                ticketsGerados: number;
                                residualAntes: number;
                                residualApos: number;
                            };
                        }) => {
                            ordem.push("create-nfce");
                            expect(args.data.chaveAcesso).toBe("35260944444444000144650010000000011123456780");
                            expect(args.data.ticketsGerados).toBe(5);
                            expect(args.data.residualAntes).toBe(0);
                            expect(args.data.residualApos).toBe(5);
                            return {
                                id: 11,
                                ...args.data,
                                campanhaId: 1,
                                consumidorId: 9,
                                lojistaId: 2,
                                valorNota: 55,
                                dataEmissao: new Date("2026-09-04T15:00:00.000Z"),
                            };
                        },
                    },
                }),
        };

        const repo = new RepositorioProcessamentoNfce(prisma as never);
        const resultado = await repo.processarComCredito({
            chaveAcesso: "35260944444444000144650010000000011123456780",
            campanhaId: 1,
            consumidorId: 9,
            lojistaId: 2,
            valorNota: 55,
            dataEmissao: new Date("2026-09-04T15:00:00.000Z"),
            valorPorTicket: 10,
        });

        expect(resultado.ticketsGerados).toBe(5);
        expect(resultado.residualApos).toBe(5);
        expect(resultado.ticketsTotaisCampanha).toBe(5);
        expect(ordem).toEqual([
            "ensure-residual",
            "lock-residual",
            "load-residual",
            "create-nfce",
            "update-residual",
        ]);
    });

    it("P2002 da chave UNIQUE vira 409", async () => {
        const prisma = {
            $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    residualTicketCampanha: {
                        createMany: vi.fn().mockResolvedValue({ count: 0 }),
                        findUnique: vi.fn().mockResolvedValue({
                            id: 1,
                            valorResidual: 0,
                            ticketsTotais: 0,
                        }),
                        update: vi.fn(),
                    },
                    $executeRaw: vi.fn(),
                    processamentoNfce: {
                        create: vi.fn().mockRejectedValue({ code: "P2002" }),
                    },
                }),
        };

        const repo = new RepositorioProcessamentoNfce(prisma as never);
        await expect(
            repo.processarComCredito({
                chaveAcesso: "35260944444444000144650010000000011123456780",
                campanhaId: 1,
                consumidorId: 9,
                lojistaId: 2,
                valorNota: 55,
                dataEmissao: new Date("2026-09-04T15:00:00.000Z"),
                valorPorTicket: 10,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: "Nota fiscal ja utilizada",
        } satisfies Partial<ErroAplicacao>);
    });

    it("acumula residual anterior (R$5 + residual R$5 / R$10 → 1 ticket + 0)", async () => {
        const prisma = {
            $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    residualTicketCampanha: {
                        createMany: async () => ({ count: 0 }),
                        findUnique: async () => ({
                            id: 7,
                            valorResidual: 5,
                            ticketsTotais: 5,
                        }),
                        update: async (args: {
                            data: { valorResidual: number; ticketsTotais: { increment: number } };
                        }) => {
                            expect(args.data.valorResidual).toBe(0);
                            expect(args.data.ticketsTotais.increment).toBe(1);
                            return { id: 7, ticketsTotais: 6, valorResidual: 0 };
                        },
                    },
                    $executeRaw: async () => undefined,
                    processamentoNfce: {
                        create: async (args: {
                            data: { ticketsGerados: number; residualAntes: number; residualApos: number };
                        }) => {
                            expect(args.data.ticketsGerados).toBe(1);
                            expect(args.data.residualAntes).toBe(5);
                            expect(args.data.residualApos).toBe(0);
                            return {
                                id: 12,
                                chaveAcesso: "x",
                                campanhaId: 1,
                                consumidorId: 9,
                                lojistaId: 2,
                                valorNota: 5,
                                ...args.data,
                                dataEmissao: new Date(),
                            };
                        },
                    },
                }),
        };

        const repo = new RepositorioProcessamentoNfce(prisma as never);
        const resultado = await repo.processarComCredito({
            chaveAcesso: "35260944444444000144650010000000021123456781",
            campanhaId: 1,
            consumidorId: 9,
            lojistaId: 2,
            valorNota: 5,
            dataEmissao: new Date("2026-09-04T16:00:00.000Z"),
            valorPorTicket: 10,
        });

        expect(resultado.ticketsGerados).toBe(1);
        expect(resultado.residualApos).toBe(0);
        expect(resultado.ticketsTotaisCampanha).toBe(6);
    });
});
