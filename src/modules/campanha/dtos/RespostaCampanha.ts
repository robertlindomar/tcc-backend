export interface RespostaCampanha {
    id: number;
    nome: string;
    descricao: string | null;
    qrcode: string | null;
    dataInicio: Date;
    dataFim: Date;
    dataInicioCivil: string;
    dataFimCivil: string;
    valorPorTicket: number;
    associacaoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
