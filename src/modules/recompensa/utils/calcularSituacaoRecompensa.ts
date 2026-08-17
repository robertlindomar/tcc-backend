import { missaoEstaExpirada } from "../../../shared/tempo/calcularChavePeriodoMissao";

export type SituacaoRecompensa = "DISPONIVEL" | "DESATIVADA" | "EXPIRADA" | "ESGOTADA";

export function calcularSituacaoRecompensa(
    recompensa: { ativa: boolean; dataFim: Date | null; estoque: number | null },
    agora: Date,
): SituacaoRecompensa {
    if (!recompensa.ativa) {
        return "DESATIVADA";
    }
    if (missaoEstaExpirada(recompensa.dataFim, agora)) {
        return "EXPIRADA";
    }
    if (recompensa.estoque === 0) {
        return "ESGOTADA";
    }
    return "DISPONIVEL";
}
