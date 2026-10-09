import { FrequenciaMissao } from "../../generated/prisma/enums";
import {
    adicionarDiasCivil,
    civilNoFuso,
    DataCivil,
    FUSO_NEGOCIO_TCC,
    instanteCivilNoFuso,
} from "./fusoNegocio";

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

function inicioDoDiaCivil(data: DataCivil, fuso: string): Date {
    return instanteCivilNoFuso(
        { ...data, hora: 0, minuto: 0, segundo: 0 },
        fuso,
    );
}

function segundaDaSemanaIso(civil: DataCivil): DataCivil {
    const utc = new Date(Date.UTC(civil.ano, civil.mes - 1, civil.dia));
    const diaSemana = utc.getUTCDay();
    const diasDesdeSegunda = (diaSemana + 6) % 7;
    return adicionarDiasCivil(civil, -diasDesdeSegunda);
}

/**
 * Início do próximo período em que a missão pode ser concluída novamente.
 * Null para UMA_VEZ (missão não repete).
 */
export function calcularInicioProximoPeriodoMissao(
    frequencia: FrequenciaMissao,
    agora: Date,
    fuso: string = FUSO_NEGOCIO_TCC,
): Date | null {
    if (frequencia === FrequenciaMissao.UMA_VEZ) {
        return null;
    }

    const civil = civilNoFuso(agora, fuso);

    if (frequencia === FrequenciaMissao.DIARIA) {
        const proximoDia = adicionarDiasCivil(civil, 1);
        return inicioDoDiaCivil(proximoDia, fuso);
    }

    if (frequencia === FrequenciaMissao.MENSAL) {
        const proximoMes = civil.mes === 12 ? 1 : civil.mes + 1;
        const proximoAno = civil.mes === 12 ? civil.ano + 1 : civil.ano;
        return inicioDoDiaCivil({ ano: proximoAno, mes: proximoMes, dia: 1 }, fuso);
    }

    const segundaAtual = segundaDaSemanaIso(civil);
    const segundaSeguinte = adicionarDiasCivil(segundaAtual, 7);
    return inicioDoDiaCivil(segundaSeguinte, fuso);
}

/** Válida enquanto agora <= dataFim. Null = legado/permanente (não expirada nesta fatia). */
export function missaoEstaExpirada(dataFim: Date | null, agora: Date): boolean {
    if (!dataFim) {
        return false;
    }
    return agora.getTime() > dataFim.getTime();
}
