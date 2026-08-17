import { describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioMissaoConsumidor } from "./RepositorioMissaoConsumidor";

describe("RepositorioMissaoConsumidor.concluirComPontos", () => {
    it("insere a conclusao antes de creditar pontos na transacao", async () => {
        const ordem: string[] = [];
        const prisma = {
            $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    missaoConsumidor: {
                        create: async (args: { data: { chavePeriodo: string } }) => {
                            ordem.push("create");
                            expect(args.data.chavePeriodo).toBe("2026-08-17");
                            return {
                                id: 1,
                                missaoId: 8,
                                consumidorId: 5,
                                chavePeriodo: "2026-08-17",
                                dataCriacao: new Date(),
                                dataAtualizacao: new Date(),
                            };
                        },
                    },
                    consumidor: {
                        findUnique: async () => {
                            ordem.push("find");
                            return {
                                id: 5,
                                cpf: "123.456.789-00",
                                pontos: 10,
                                nivel: 1,
                                sexoId: null,
                                lojistaId: null,
                                usuarioId: 30,
                                dataCriacao: new Date(),
                                dataAtualizacao: new Date(),
                            };
                        },
                        update: async () => {
                            ordem.push("update");
                            return {
                                id: 5,
                                cpf: "123.456.789-00",
                                pontos: 15,
                                nivel: 1,
                                sexoId: null,
                                lojistaId: null,
                                usuarioId: 30,
                                dataCriacao: new Date(),
                                dataAtualizacao: new Date(),
                            };
                        },
                    },
                }),
        };

        const repo = new RepositorioMissaoConsumidor(prisma as never);
        const resultado = await repo.concluirComPontos({
            missaoId: 8,
            consumidorId: 5,
            chavePeriodo: "2026-08-17",
            pontoRecompensa: 5,
        });

        expect(ordem).toEqual(["create", "find", "update"]);
        expect(resultado.consumidor.pontos).toBe(15);
    });

    it("P2002 da UNIQUE vira 409 e nao deixa credito orfao no catch", async () => {
        const prisma = {
            $transaction: vi.fn().mockRejectedValue({ code: "P2002" }),
        };
        const repo = new RepositorioMissaoConsumidor(prisma as never);

        await expect(
            repo.concluirComPontos({
                missaoId: 8,
                consumidorId: 5,
                chavePeriodo: "2026-08-17",
                pontoRecompensa: 5,
            }),
        ).rejects.toMatchObject({
            message: "Missao ja concluida neste periodo",
            statusCode: 409,
        } satisfies Partial<ErroAplicacao>);
    });
});
