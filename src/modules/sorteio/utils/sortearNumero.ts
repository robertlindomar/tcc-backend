import { randomInt } from "node:crypto";

/** Retorna um inteiro uniforme em [minimo, maximo] (inclusive). */
export type SortearNumero = (minimo: number, maximo: number) => number;

export const sortearNumeroAleatorio: SortearNumero = (minimo, maximo) =>
    randomInt(minimo, maximo + 1);
