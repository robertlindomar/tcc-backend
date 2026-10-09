export type StatusVigenciaPromocao = "ATIVA" | "DESATIVADA" | "EXPIRADA";

export function calcularStatusVigenciaPromocao(params: {
    ativa: boolean;
    dataInicio: Date;
    dataFim: Date;
    agora?: Date;
}): StatusVigenciaPromocao {
    if (!params.ativa) {
        return "DESATIVADA";
    }

    const agora = params.agora ?? new Date();
    const instante = agora.getTime();
    if (instante < params.dataInicio.getTime() || instante > params.dataFim.getTime()) {
        return "EXPIRADA";
    }

    return "ATIVA";
}

export function calcularDataFimPromocao(dataInicio: Date, duracaoDias: number): Date {
    return new Date(dataInicio.getTime() + duracaoDias * 24 * 60 * 60 * 1000);
}
