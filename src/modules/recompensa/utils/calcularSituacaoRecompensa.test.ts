import { describe, expect, it } from "vitest";
import { fimDoDiaCivilNoFuso, instanteCivilNoFuso } from "../../../shared/tempo/fusoNegocio";
import { calcularSituacaoRecompensa } from "./calcularSituacaoRecompensa";

describe("calcularSituacaoRecompensa", () => {
    const agora = instanteCivilNoFuso({
        ano: 2026,
        mes: 8,
        dia: 17,
        hora: 12,
        minuto: 0,
        segundo: 0,
    });

    it("ativa=false vence as demais e vira DESATIVADA", () => {
        expect(
            calcularSituacaoRecompensa(
                { ativa: false, dataFim: fimDoDiaCivilNoFuso({ ano: 2026, mes: 1, dia: 1 }), estoque: 0 },
                agora,
            ),
        ).toBe("DESATIVADA");
    });

    it("ativa e vencida vira EXPIRADA mesmo com estoque", () => {
        expect(
            calcularSituacaoRecompensa(
                { ativa: true, dataFim: fimDoDiaCivilNoFuso({ ano: 2026, mes: 8, dia: 16 }), estoque: 10 },
                agora,
            ),
        ).toBe("EXPIRADA");
    });

    it("ativa, valida e estoque 0 vira ESGOTADA", () => {
        expect(
            calcularSituacaoRecompensa(
                { ativa: true, dataFim: null, estoque: 0 },
                agora,
            ),
        ).toBe("ESGOTADA");
    });

    it("restante e DISPONIVEL inclusive estoque null", () => {
        expect(
            calcularSituacaoRecompensa(
                { ativa: true, dataFim: null, estoque: null },
                agora,
            ),
        ).toBe("DISPONIVEL");
    });

    it("agora igual a dataFim permanece DISPONIVEL", () => {
        const fim = fimDoDiaCivilNoFuso({ ano: 2026, mes: 8, dia: 17 });
        expect(
            calcularSituacaoRecompensa(
                { ativa: true, dataFim: fim, estoque: 10 },
                fim,
            ),
        ).toBe("DISPONIVEL");
    });
});
