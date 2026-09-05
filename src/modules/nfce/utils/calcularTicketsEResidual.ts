/**
 * Converte reais para centavos inteiros (evita erro de ponto flutuante).
 */
export function reaisParaCentavos(valor: number): number {
    if (!Number.isFinite(valor)) {
        throw new Error("VALOR_INVALIDO");
    }
    return Math.round(valor * 100);
}

export function centavosParaReais(centavos: number): number {
    return Math.round(centavos) / 100;
}

export type EntradaCalculoTickets = {
    valorNota: number;
    residualAnterior: number;
    valorPorTicket: number;
};

export type ResultadoCalculoTickets = {
    tickets: number;
    residualNovo: number;
    totalDisponivel: number;
};

/**
 * Converte valor da nota + residual anterior em tickets e novo residual.
 * tickets = floor((nota + residual) / valorPorTicket)
 * residualNovo = resto (nunca descarta).
 */
export function calcularTicketsEResidual(
    entrada: EntradaCalculoTickets,
): ResultadoCalculoTickets {
    const { valorNota, residualAnterior, valorPorTicket } = entrada;

    if (!Number.isFinite(valorNota) || valorNota < 0) {
        throw new Error("VALOR_NOTA_INVALIDO");
    }
    if (!Number.isFinite(residualAnterior) || residualAnterior < 0) {
        throw new Error("RESIDUAL_INVALIDO");
    }
    if (!Number.isFinite(valorPorTicket) || valorPorTicket <= 0) {
        throw new Error("VALOR_POR_TICKET_INVALIDO");
    }

    const notaCents = reaisParaCentavos(valorNota);
    const residualCents = reaisParaCentavos(residualAnterior);
    const ticketCents = reaisParaCentavos(valorPorTicket);

    if (ticketCents <= 0) {
        throw new Error("VALOR_POR_TICKET_INVALIDO");
    }

    const totalCents = notaCents + residualCents;
    const tickets = Math.floor(totalCents / ticketCents);
    const residualNovoCents = totalCents % ticketCents;

    return {
        tickets,
        residualNovo: centavosParaReais(residualNovoCents),
        totalDisponivel: centavosParaReais(totalCents),
    };
}
