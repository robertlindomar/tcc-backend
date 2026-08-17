/**
 * Fuso civil do TCC (Santa Fé do Sul / operação demo).
 * Não usar o timezone do processo/container para dia, semana ou mês.
 * Sobrescrita opcional: FUSO_NEGOCIO.
 */
export const FUSO_NEGOCIO_TCC = process.env.FUSO_NEGOCIO ?? "America/Sao_Paulo";

export type DataCivil = {
    ano: number;
    mes: number;
    dia: number;
};

export type InstanteCivil = DataCivil & {
    hora: number;
    minuto: number;
    segundo: number;
};

function numeroDaParte(
    partes: Intl.DateTimeFormatPart[],
    tipo: Intl.DateTimeFormatPartTypes,
): number {
    const parte = partes.find((item) => item.type === tipo);
    if (!parte) {
        throw new Error(`Parte ${tipo} ausente no fuso ${FUSO_NEGOCIO_TCC}`);
    }
    return Number(parte.value);
}

export function civilNoFuso(
    agora: Date,
    fuso: string = FUSO_NEGOCIO_TCC,
): InstanteCivil {
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: fuso,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(agora);

    return {
        ano: numeroDaParte(partes, "year"),
        mes: numeroDaParte(partes, "month"),
        dia: numeroDaParte(partes, "day"),
        hora: numeroDaParte(partes, "hour"),
        minuto: numeroDaParte(partes, "minute"),
        segundo: numeroDaParte(partes, "second"),
    };
}

export function instanteCivilNoFuso(
    civil: InstanteCivil,
    fuso: string = FUSO_NEGOCIO_TCC,
): Date {
    let millis = Date.UTC(
        civil.ano,
        civil.mes - 1,
        civil.dia,
        civil.hora,
        civil.minuto,
        civil.segundo,
        0,
    );

    for (let i = 0; i < 16; i += 1) {
        const atual = civilNoFuso(new Date(millis), fuso);
        const obtido = Date.UTC(
            atual.ano,
            atual.mes - 1,
            atual.dia,
            atual.hora,
            atual.minuto,
            atual.segundo,
            0,
        );
        const desejado = Date.UTC(
            civil.ano,
            civil.mes - 1,
            civil.dia,
            civil.hora,
            civil.minuto,
            civil.segundo,
            0,
        );
        const delta = desejado - obtido;
        if (delta === 0) {
            return new Date(millis);
        }
        millis += delta;
    }

    return new Date(millis);
}

function adicionarDiasCivil(data: DataCivil, dias: number): DataCivil {
    const utc = new Date(Date.UTC(data.ano, data.mes - 1, data.dia + dias));
    return {
        ano: utc.getUTCFullYear(),
        mes: utc.getUTCMonth() + 1,
        dia: utc.getUTCDate(),
    };
}

/** Último instante do dia civil no fuso (válida enquanto agora <= este instante). */
export function fimDoDiaCivilNoFuso(
    data: DataCivil,
    fuso: string = FUSO_NEGOCIO_TCC,
): Date {
    const proximo = adicionarDiasCivil(data, 1);
    const inicioProximo = instanteCivilNoFuso(
        {
            ...proximo,
            hora: 0,
            minuto: 0,
            segundo: 0,
        },
        fuso,
    );
    return new Date(inicioProximo.getTime() - 1);
}

export function parseDataCivil(valor: string): DataCivil | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    if (!match) {
        return null;
    }
    const ano = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);
    const utc = new Date(Date.UTC(ano, mes - 1, dia));
    if (
        utc.getUTCFullYear() !== ano ||
        utc.getUTCMonth() + 1 !== mes ||
        utc.getUTCDate() !== dia
    ) {
        return null;
    }
    return { ano, mes, dia };
}
