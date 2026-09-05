export interface DTOAtualizarCampanha {
    nome?: string;
    descricao?: string | null;
    qrcode?: string | null;
    dataInicio?: string;
    dataFim?: string;
    valorPorTicket?: number;
}
