import { describe, expect, it, vi } from "vitest";
import { RepositorioCampanha } from "./RepositorioCampanha";

describe("RepositorioCampanha.buscarSobrepostaAoPeriodo", () => {
    const inicio = new Date("2026-10-01T03:00:00.000Z");
    const fim = new Date("2026-11-01T02:59:59.999Z");

    function preparar(resultado: unknown = null) {
        const findFirst = vi.fn().mockResolvedValue(resultado);
        const repositorio = new RepositorioCampanha({ campanha: { findFirst } } as never);
        return { findFirst, repositorio };
    }

    it("procura campanhas cujo período cruza o informado", async () => {
        const { findFirst, repositorio } = preparar();
        await expect(repositorio.buscarSobrepostaAoPeriodo(inicio, fim)).resolves.toBeNull();
        expect(findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { dataInicio: { lte: fim }, dataFim: { gte: inicio } },
            }),
        );
    });

    it("ignora a própria campanha na edição", async () => {
        const { findFirst, repositorio } = preparar();
        await repositorio.buscarSobrepostaAoPeriodo(inicio, fim, 9);
        expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: { not: 9 } });
    });

    it("retorna a campanha conflitante", async () => {
        const { repositorio } = preparar({
            id: 2,
            nome: "Natal",
            descricao: null,
            qrcode: null,
            dataInicio: inicio,
            dataFim: fim,
            valorPorTicket: 10,
            associacaoId: 1,
            dataCriacao: inicio,
            dataAtualizacao: inicio,
        });
        const conflito = await repositorio.buscarSobrepostaAoPeriodo(inicio, fim);
        expect(conflito?.id).toBe(2);
        expect(conflito?.nome).toBe("Natal");
    });
});
