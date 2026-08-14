import { describe, expect, it } from "vitest";
import {
    calcularDataFimPromocao,
    calcularStatusVigenciaPromocao,
} from "./calcularStatusVigenciaPromocao";

describe("calcularStatusVigenciaPromocao", () => {
    const dataInicio = new Date("2026-08-14T12:00:00.000Z");
    const dataFim = new Date("2026-08-21T12:00:00.000Z");

    it("ativa e dentro da janela e vigente", () => {
        expect(
            calcularStatusVigenciaPromocao({
                ativa: true,
                dataInicio,
                dataFim,
                agora: new Date("2026-08-16T12:00:00.000Z"),
            }),
        ).toBe("ATIVA");
    });

    it("ativa e apos dataFim e expirada", () => {
        expect(
            calcularStatusVigenciaPromocao({
                ativa: true,
                dataInicio,
                dataFim,
                agora: new Date("2026-08-22T12:00:00.000Z"),
            }),
        ).toBe("EXPIRADA");
    });

    it("ativa=false e desativada mesmo dentro da data", () => {
        expect(
            calcularStatusVigenciaPromocao({
                ativa: false,
                dataInicio,
                dataFim,
                agora: new Date("2026-08-16T12:00:00.000Z"),
            }),
        ).toBe("DESATIVADA");
    });
});

describe("calcularDataFimPromocao", () => {
    it("soma dias em milissegundos", () => {
        const inicio = new Date("2026-08-14T00:00:00.000Z");
        expect(calcularDataFimPromocao(inicio, 7).toISOString()).toBe(
            "2026-08-21T00:00:00.000Z",
        );
    });
});
