import { describe, expect, it } from "vitest";
import { calcularTicketsEResidual } from "./calcularTicketsEResidual";

describe("calcularTicketsEResidual", () => {
    it("R$55 com ticket R$10 e residual 0 → 5 tickets + R$5", () => {
        expect(
            calcularTicketsEResidual({
                valorNota: 55,
                residualAnterior: 0,
                valorPorTicket: 10,
            }),
        ).toEqual({
            tickets: 5,
            residualNovo: 5,
            totalDisponivel: 55,
        });
    });

    it("segunda nota R$5 com residual R$5 e ticket R$10 → 1 ticket + R$0", () => {
        expect(
            calcularTicketsEResidual({
                valorNota: 5,
                residualAnterior: 5,
                valorPorTicket: 10,
            }),
        ).toEqual({
            tickets: 1,
            residualNovo: 0,
            totalDisponivel: 10,
        });
    });

    it("R12: R$27,50 + residual 0 → 2 tickets + R$7,50", () => {
        expect(
            calcularTicketsEResidual({
                valorNota: 27.5,
                residualAnterior: 0,
                valorPorTicket: 10,
            }),
        ).toEqual({
            tickets: 2,
            residualNovo: 7.5,
            totalDisponivel: 27.5,
        });
    });

    it("R12: R$5,00 com residual R$7,50 → 1 ticket + R$2,50", () => {
        expect(
            calcularTicketsEResidual({
                valorNota: 5,
                residualAnterior: 7.5,
                valorPorTicket: 10,
            }),
        ).toEqual({
            tickets: 1,
            residualNovo: 2.5,
            totalDisponivel: 12.5,
        });
    });

    it("nota menor que o ticket só acumula residual", () => {
        expect(
            calcularTicketsEResidual({
                valorNota: 3.2,
                residualAnterior: 1.1,
                valorPorTicket: 10,
            }),
        ).toEqual({
            tickets: 0,
            residualNovo: 4.3,
            totalDisponivel: 4.3,
        });
    });

    it("recusa valorPorTicket <= 0", () => {
        expect(() =>
            calcularTicketsEResidual({
                valorNota: 10,
                residualAnterior: 0,
                valorPorTicket: 0,
            }),
        ).toThrow("VALOR_POR_TICKET_INVALIDO");
    });

    it("recusa valores negativos", () => {
        expect(() =>
            calcularTicketsEResidual({
                valorNota: -1,
                residualAnterior: 0,
                valorPorTicket: 10,
            }),
        ).toThrow("VALOR_NOTA_INVALIDO");
        expect(() =>
            calcularTicketsEResidual({
                valorNota: 10,
                residualAnterior: -0.01,
                valorPorTicket: 10,
            }),
        ).toThrow("RESIDUAL_INVALIDO");
    });
});
