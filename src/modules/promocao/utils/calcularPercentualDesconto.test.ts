import { describe, expect, it } from "vitest";
import { calcularPercentualDesconto } from "./calcularPercentualDesconto";

describe("calcularPercentualDesconto", () => {
    it("calcula o desconto arredondado", () => {
        expect(calcularPercentualDesconto(100, 90)).toBe(10);
    });

    it("devolve nulo quando nao ha reducao", () => {
        expect(calcularPercentualDesconto(50, 50)).toBeNull();
        expect(calcularPercentualDesconto(0, 10)).toBeNull();
    });
});
