import { describe, expect, it } from "vitest";
import { calcularDataLimiteSorteio, prazoSorteioEncerrado } from "./prazoSorteio";

describe("prazo de sete dias do sorteio", () => {
    const sorteadoEm = new Date("2026-10-06T12:34:56.000Z");
    it("é de 168 horas desde a tentativa, inclusive no limite", () => {
        const limite = calcularDataLimiteSorteio(sorteadoEm);
        expect(limite.toISOString()).toBe("2026-10-13T12:34:56.000Z");
        expect(prazoSorteioEncerrado(sorteadoEm, limite)).toBe(false);
        expect(prazoSorteioEncerrado(sorteadoEm, new Date(limite.getTime() + 1))).toBe(true);
    });
});
