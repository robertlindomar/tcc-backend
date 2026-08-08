/**
 * Serializa Decimal do Prisma (ou number/string) para number no JSON.
 * Seguro para Decimal(10,2) de preços/valores do domínio.
 */
export function decimalParaNumero(valor: { toString(): string } | number | string): number {
    const n = typeof valor === "number" ? valor : Number(valor);
    if (!Number.isFinite(n)) {
        throw new Error("Valor decimal invalido");
    }
    return n;
}
