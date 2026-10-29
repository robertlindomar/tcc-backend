/** Situação do sorteio de uma edição, derivada de período, tickets e resultado. */
export type SituacaoSorteioEdicao =
    | "AGUARDANDO_ENCERRAMENTO"
    | "PRONTO_PARA_SORTEAR"
    | "SEM_TICKETS"
    | "AGUARDANDO_ENTREGA"
    | "ENTREGUE";

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
    ativa: boolean;
    /** Edição atual (1..N). */
    edicao: number;
    /** Tickets da edição atual. */
    totalTickets: number;
    /** Sorteio da edição atual. */
    sorteioId: number | null;
    periodoEncerrado: boolean;
    situacaoSorteio: SituacaoSorteioEdicao;
}

export interface RespostaEdicaoCampanha {
    edicao: number;
    atual: boolean;
    dataInicio: Date;
    dataFim: Date;
    dataInicioCivil: string;
    dataFimCivil: string;
    valorPorTicket: number;
    totalTickets: number;
    sorteioId: number;
    periodoEncerrado: boolean;
    situacaoSorteio: SituacaoSorteioEdicao;
    dataSorteio: Date | null;
}
