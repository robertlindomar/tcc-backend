import { describe, expect, it } from "vitest";
import { RepositorioConsumidor } from "./RepositorioConsumidor";

describe("RepositorioConsumidor visitantes", () => {
    it("lista visitantes pela missao de sistema da loja, nao por Consumidor.lojistaId", async () => {
        const groupBy = async (args: { where: unknown }) => {
            expect(args.where).toEqual({
                missao: { lojistaId: 10, sistema: true },
            });
            return [
                {
                    consumidorId: 7,
                    _count: { id: 3 },
                    _min: { dataCriacao: new Date("2026-08-15T12:00:00.000Z") },
                    _max: { dataCriacao: new Date("2026-08-17T12:00:00.000Z") },
                },
            ];
        };
        const findMany = async (args: { where: { id: { in: number[] } } }) => {
            expect(args.where.id.in).toEqual([7]);
            return [{ id: 7, usuario: { nome: "Robert Lindomar" } }];
        };

        const repo = new RepositorioConsumidor({
            missaoConsumidor: { groupBy },
            consumidor: { findMany },
        } as never);

        const lista = await repo.listarVisitantesPorLoja(10);

        expect(lista).toEqual([
            {
                id: 7,
                nome: "Robert Lindomar",
                quantidadeVisitas: 3,
                primeiraVisita: new Date("2026-08-15T12:00:00.000Z"),
                ultimaVisita: new Date("2026-08-17T12:00:00.000Z"),
            },
        ]);
    });

    it("detalhe de visitante filtra pela missao sistema da propria loja", async () => {
        const groupBy = async (args: { where: unknown }) => {
            expect(args.where).toEqual({
                consumidorId: 7,
                missao: { lojistaId: 10, sistema: true },
            });
            return [
                {
                    consumidorId: 7,
                    _count: { id: 1 },
                    _min: { dataCriacao: new Date("2026-08-17T12:00:00.000Z") },
                    _max: { dataCriacao: new Date("2026-08-17T12:00:00.000Z") },
                },
            ];
        };
        const findUnique = async () => ({
            id: 7,
            usuario: { nome: "Robert Lindomar" },
        });

        const repo = new RepositorioConsumidor({
            missaoConsumidor: { groupBy },
            consumidor: { findUnique },
        } as never);

        const visitante = await repo.buscarVisitanteDaLoja(7, 10);

        expect(visitante?.quantidadeVisitas).toBe(1);
        expect(visitante?.nome).toBe("Robert Lindomar");
    });
});
