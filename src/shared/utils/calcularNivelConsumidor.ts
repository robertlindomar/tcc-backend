/**
 * Nível a partir dos pontos: floor(pontos / 100) + 1 (mínimo 1).
 * Ex.: 0–99 → 1; 100–199 → 2.
 */
export function calcularNivelConsumidor(pontos: number): number {
    if (!Number.isFinite(pontos) || pontos < 0) {
        return 1;
    }
    return Math.floor(pontos / 100) + 1;
}
