import { describe, expect, it } from "vitest";
import { calcularProgressoXp, calcularXp } from "./calcularProgressoXp";

describe("calcularProgressoXp", () => {
    it("XP é saldo + pontos gastos, ignorando valores negativos", () => {
        expect(calcularXp(40, 210)).toBe(250);
        expect(calcularXp(-5, 10)).toBe(10);
    });

    it("faixas de 100 XP por nível", () => {
        expect(calcularProgressoXp(0)).toEqual({ nivel: 1, xpInicioNivel: 0, xpProximoNivel: 100 });
        expect(calcularProgressoXp(99)).toEqual({ nivel: 1, xpInicioNivel: 0, xpProximoNivel: 100 });
        expect(calcularProgressoXp(100)).toEqual({ nivel: 2, xpInicioNivel: 100, xpProximoNivel: 200 });
        expect(calcularProgressoXp(250)).toEqual({ nivel: 3, xpInicioNivel: 200, xpProximoNivel: 300 });
    });
});
