export interface DTOReativarCampanha {
    /** YYYY-MM-DD (início do dia civil) ou ISO. */
    dataInicio: string;
    /** YYYY-MM-DD (fim do dia civil) ou ISO. */
    dataFim: string;
    /** Opcional: se omitido, reutiliza o valor atual. */
    valorPorTicket?: number;
}
