/** Sete dias corridos (168 horas) desde cada tentativa de sorteio. */
export const PRAZO_SORTEIO_MS = 7 * 24 * 60 * 60 * 1000;
export function calcularDataLimiteSorteio(dataSorteio: Date): Date {
    return new Date(dataSorteio.getTime() + PRAZO_SORTEIO_MS);
}
export function prazoSorteioEncerrado(dataSorteio: Date, agora: Date): boolean {
    return agora.getTime() > calcularDataLimiteSorteio(dataSorteio).getTime();
}
