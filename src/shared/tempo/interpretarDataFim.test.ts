import { describe, expect, it } from "vitest";
import { interpretarDataFim } from "./interpretarDataFim";
import { civilNoFuso, fimDoDiaCivilNoFuso } from "./fusoNegocio";

describe("interpretarDataFim", () => {
    it("YYYY-MM-DD vira o fim do dia civil no fuso de negócio", () => {
        const dataFim = interpretarDataFim("2026-09-30");
        const esperado = fimDoDiaCivilNoFuso({ ano: 2026, mes: 9, dia: 30 });
        expect(dataFim.getTime()).toBe(esperado.getTime());
        const civil = civilNoFuso(dataFim);
        expect(civil).toMatchObject({ ano: 2026, mes: 9, dia: 30, hora: 23, minuto: 59, segundo: 59 });
    });

    it("rejeita data civil inexistente", () => {
        expect(() => interpretarDataFim("2026-02-31")).toThrow();
    });
});
