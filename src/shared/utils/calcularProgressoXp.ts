import { calcularNivelConsumidor } from "./calcularNivelConsumidor";

export const XP_POR_NIVEL = 100;

/**
 * XP = pontos atuais + pontos já gastos em resgates não recusados, ou seja,
 * tudo o que o consumidor já ganhou. Gastar pontos não reduz XP; recusa devolve
 * os pontos e tira o gasto, então o XP também não muda.
 */
export function calcularXp(pontosAtuais: number, pontosGastos: number): number {
    return Math.max(0, pontosAtuais) + Math.max(0, pontosGastos);
}

/** Nível de XP com a mesma escala do nível por pontos (100 por nível). */
export function calcularProgressoXp(xp: number): {
    nivel: number;
    xpInicioNivel: number;
    xpProximoNivel: number;
} {
    const nivel = calcularNivelConsumidor(xp);
    const xpInicioNivel = (nivel - 1) * XP_POR_NIVEL;
    return { nivel, xpInicioNivel, xpProximoNivel: xpInicioNivel + XP_POR_NIVEL };
}
