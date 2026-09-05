export interface DTOCriarCampanha {
    nome: string;
    descricao?: string | null;
    qrcode?: string | null;
    /** YYYY-MM-DD (início do dia civil) ou ISO. */
    dataInicio: string;
    /** YYYY-MM-DD (fim do dia civil) ou ISO. */
    dataFim: string;
    /** Reais por 1 ticket; deve ser > 0. */
    valorPorTicket: number;
}
