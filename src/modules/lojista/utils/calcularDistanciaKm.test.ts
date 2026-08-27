import { describe, expect, it } from "vitest";
import { calcularDistanciaKm } from "./calcularDistanciaKm";

describe("calcularDistanciaKm", () => {
    it("retorna zero para o mesmo ponto", () => {
        expect(
            calcularDistanciaKm(
                { latitude: -23.55052, longitude: -46.633308 },
                { latitude: -23.55052, longitude: -46.633308 },
            ),
        ).toBe(0);
    });

    it("calcula a distancia conhecida entre Sao Paulo e Rio de Janeiro", () => {
        const distancia = calcularDistanciaKm(
            { latitude: -23.55052, longitude: -46.633308 },
            { latitude: -22.906847, longitude: -43.172897 },
        );

        expect(distancia).toBeGreaterThan(355);
        expect(distancia).toBeLessThan(365);
    });
});
