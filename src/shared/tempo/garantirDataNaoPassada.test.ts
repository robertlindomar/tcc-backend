import { describe, expect, it } from "vitest";
import { garantirDataNaoPassada } from "./garantirDataNaoPassada";
import { fimDoDiaCivilNoFuso, instanteCivilNoFuso } from "./fusoNegocio";

const agora = new Date("2026-10-27T15:00:00.000Z");
const inicioDeHoje = instanteCivilNoFuso({ ano: 2026, mes: 10, dia: 27, hora: 0, minuto: 0, segundo: 0 });
const fimDeOntem = fimDoDiaCivilNoFuso({ ano: 2026, mes: 10, dia: 26 });

describe("garantirDataNaoPassada", () => {
    it("aceita hoje, mesmo no início do dia", () => {
        expect(() => garantirDataNaoPassada(inicioDeHoje, "dataInicio", null, agora)).not.toThrow();
    });

    it("rejeita ontem com a mensagem do campo", () => {
        expect(() => garantirDataNaoPassada(fimDeOntem, "dataFim", null, agora)).toThrow(
            "dataFim nao pode ser anterior a hoje",
        );
    });

    it("aceita data passada igual à já salva", () => {
        expect(() =>
            garantirDataNaoPassada(fimDeOntem, "dataFim", new Date(fimDeOntem), agora),
        ).not.toThrow();
    });

    it("ignora data vazia", () => {
        expect(() => garantirDataNaoPassada(null, "dataFim", null, agora)).not.toThrow();
    });
});
