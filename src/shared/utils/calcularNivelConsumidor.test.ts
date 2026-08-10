import { describe, expect, it } from "vitest";
import { calcularNivelConsumidor } from "./calcularNivelConsumidor";

describe("calcularNivelConsumidor", () => {
    it("retorna nivel 1 para 0 pontos", () => {
        expect(calcularNivelConsumidor(0)).toBe(1);
    });

    it("retorna nivel 1 para 99 pontos", () => {
        expect(calcularNivelConsumidor(99)).toBe(1);
    });

    it("retorna nivel 2 para 100 pontos", () => {
        expect(calcularNivelConsumidor(100)).toBe(2);
    });

    it("retorna nivel 3 para 250 pontos", () => {
        expect(calcularNivelConsumidor(250)).toBe(3);
    });
});
