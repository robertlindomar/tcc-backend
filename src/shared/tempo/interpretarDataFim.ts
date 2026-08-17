import { fimDoDiaCivilNoFuso, parseDataCivil } from "./fusoNegocio";
import { missaoEstaExpirada } from "./calcularChavePeriodoMissao";

export { missaoEstaExpirada };

/** Data-only (YYYY-MM-DD) vira fim do dia civil no fuso de negócio. ISO com hora é o instante enviado. */
export function interpretarDataFim(valor: unknown): Date {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        return valor;
    }
    if (typeof valor !== "string" || !valor.trim()) {
        throw new Error("DATA_FIM_AUSENTE");
    }
    const texto = valor.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const civil = parseDataCivil(texto);
        if (!civil) {
            throw new Error("DATA_FIM_INVALIDA");
        }
        return fimDoDiaCivilNoFuso(civil);
    }
    const instante = new Date(texto);
    if (Number.isNaN(instante.getTime())) {
        throw new Error("DATA_FIM_INVALIDA");
    }
    return instante;
}
