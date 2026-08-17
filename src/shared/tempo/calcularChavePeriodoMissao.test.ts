import { describe, expect, it } from "vitest";
import { FrequenciaMissao } from "../../generated/prisma/enums";
import { calcularChavePeriodoMissao, missaoEstaExpirada } from "./calcularChavePeriodoMissao";
import { fimDoDiaCivilNoFuso, instanteCivilNoFuso } from "./fusoNegocio";

describe("calcularChavePeriodoMissao", () => {
    const meioDiaSp = (ano: number, mes: number, dia: number) =>
        instanteCivilNoFuso({
            ano,
            mes,
            dia,
            hora: 12,
            minuto: 0,
            segundo: 0,
        });

    it("UMA_VEZ sempre retorna UNICA", () => {
        expect(
            calcularChavePeriodoMissao(FrequenciaMissao.UMA_VEZ, meioDiaSp(2026, 8, 17)),
        ).toBe("UNICA");
        expect(
            calcularChavePeriodoMissao(FrequenciaMissao.UMA_VEZ, meioDiaSp(2027, 1, 1)),
        ).toBe("UNICA");
    });

    it("DIARIA usa o dia civil no fuso de negócio", () => {
        expect(
            calcularChavePeriodoMissao(FrequenciaMissao.DIARIA, meioDiaSp(2026, 8, 17)),
        ).toBe("2026-08-17");
    });

    it("DIARIA muda no instante da virada do dia no fuso", () => {
        const fim16 = fimDoDiaCivilNoFuso({ ano: 2026, mes: 8, dia: 16 });
        const inicio17 = instanteCivilNoFuso({
            ano: 2026,
            mes: 8,
            dia: 17,
            hora: 0,
            minuto: 0,
            segundo: 0,
        });

        expect(calcularChavePeriodoMissao(FrequenciaMissao.DIARIA, fim16)).toBe(
            "2026-08-16",
        );
        expect(calcularChavePeriodoMissao(FrequenciaMissao.DIARIA, inicio17)).toBe(
            "2026-08-17",
        );
        expect(inicio17.getTime() - fim16.getTime()).toBe(1);
    });

    it("SEMANAL: domingo e segunda seguinte sao semanas diferentes", () => {
        const domingo = meioDiaSp(2026, 8, 16);
        const segunda = meioDiaSp(2026, 8, 17);
        const sexta = meioDiaSp(2026, 8, 21);

        const chaveDomingo = calcularChavePeriodoMissao(
            FrequenciaMissao.SEMANAL,
            domingo,
        );
        const chaveSegunda = calcularChavePeriodoMissao(
            FrequenciaMissao.SEMANAL,
            segunda,
        );
        const chaveSexta = calcularChavePeriodoMissao(FrequenciaMissao.SEMANAL, sexta);

        expect(chaveDomingo).not.toBe(chaveSegunda);
        expect(chaveSegunda).toBe(chaveSexta);
        expect(chaveSegunda).toBe("2026-W34");
    });

    it("MENSAL: ultimo dia do mes e dia 1 do proximo", () => {
        expect(
            calcularChavePeriodoMissao(FrequenciaMissao.MENSAL, meioDiaSp(2026, 8, 31)),
        ).toBe("2026-08");
        expect(
            calcularChavePeriodoMissao(FrequenciaMissao.MENSAL, meioDiaSp(2026, 9, 1)),
        ).toBe("2026-09");
    });

    it("MENSAL: dezembro para janeiro", () => {
        expect(
            calcularChavePeriodoMissao(FrequenciaMissao.MENSAL, meioDiaSp(2026, 12, 31)),
        ).toBe("2026-12");
        expect(
            calcularChavePeriodoMissao(FrequenciaMissao.MENSAL, meioDiaSp(2027, 1, 1)),
        ).toBe("2027-01");
    });
});

describe("missaoEstaExpirada", () => {
    it("valida enquanto agora <= dataFim", () => {
        const dataFim = fimDoDiaCivilNoFuso({ ano: 2026, mes: 8, dia: 17 });
        expect(missaoEstaExpirada(dataFim, dataFim)).toBe(false);
        expect(missaoEstaExpirada(dataFim, new Date(dataFim.getTime() + 1))).toBe(true);
        expect(missaoEstaExpirada(dataFim, new Date(dataFim.getTime() - 1))).toBe(false);
    });

    it("dataFim null nao expira (legado / permanente E3b)", () => {
        expect(missaoEstaExpirada(null, new Date("2026-08-17T12:00:00.000Z"))).toBe(
            false,
        );
    });
});
