import { FrequenciaMissao } from "../../generated/prisma/enums";
import { civilNoFuso, FUSO_NEGOCIO_TCC } from "./fusoNegocio";

export const CHAVE_PERIODO_UNICA = "UNICA";

function isoSemana(ano: number, mes: number, dia: number): string {
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    data.setUTCDate(data.getUTCDate() + 4 - (data.getUTCDay() || 7));
    const inicioAno = new Date(Date.UTC(data.getUTCFullYear(), 0, 1));
    const semana = Math.ceil(
        ((data.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7,
    );
    return `${data.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}

/**
 * Chave de período da conclusão. Só o backend calcula (nunca o cliente).
 * Semana = segunda a domingo, ISO-8601, no fuso `FUSO_NEGOCIO`.
 */
export function calcularChavePeriodoMissao(
    frequencia: FrequenciaMissao,
    agora: Date,
    fuso: string = FUSO_NEGOCIO_TCC,
): string {
    if (frequencia === FrequenciaMissao.UMA_VEZ) {
        return CHAVE_PERIODO_UNICA;
    }

    const civil = civilNoFuso(agora, fuso);
    if (frequencia === FrequenciaMissao.DIARIA) {
        return `${civil.ano}-${String(civil.mes).padStart(2, "0")}-${String(civil.dia).padStart(2, "0")}`;
    }
    if (frequencia === FrequenciaMissao.MENSAL) {
        return `${civil.ano}-${String(civil.mes).padStart(2, "0")}`;
    }
    return isoSemana(civil.ano, civil.mes, civil.dia);
}

/** Válida enquanto agora <= dataFim. Null = legado/permanente (não expirada nesta fatia). */
export function missaoEstaExpirada(dataFim: Date | null, agora: Date): boolean {
    if (!dataFim) {
        return false;
    }
    return agora.getTime() > dataFim.getTime();
}
