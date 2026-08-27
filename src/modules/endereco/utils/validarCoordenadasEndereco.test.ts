import { describe, expect, it } from "vitest";
import { validarCoordenadasEndereco } from "./validarCoordenadasEndereco";

describe("validarCoordenadasEndereco", () => {
    it("aceita par valido e permite remover ambas", () => {
        expect(validarCoordenadasEndereco("-23.5", "-46.6")).toEqual({
            latitude: -23.5,
            longitude: -46.6,
        });
        expect(validarCoordenadasEndereco(null, null)).toEqual({
            latitude: null,
            longitude: null,
        });
    });

    it("rejeita par incompleto e valores fora da faixa", () => {
        expect(() => validarCoordenadasEndereco(-23.5, null)).toThrow(
            "Latitude e longitude devem ser informadas juntas",
        );
        expect(() => validarCoordenadasEndereco(-91, -46.6)).toThrow("Latitude invalida");
        expect(() => validarCoordenadasEndereco(-23.5, 181)).toThrow("Longitude invalida");
    });
});
