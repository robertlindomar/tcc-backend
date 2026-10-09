export function calcularPercentualDesconto(
    valorOriginal: number,
    precoPromocao: number,
): number | null {
    if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
        return null;
    }
    if (!Number.isFinite(precoPromocao) || precoPromocao < 0 || precoPromocao >= valorOriginal) {
        return null;
    }
    return Math.round((1 - precoPromocao / valorOriginal) * 100);
}
