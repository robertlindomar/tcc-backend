import { SituacaoResultadoSorteio } from "../model/Sorteio";

export interface RespostaResultadoSorteio {
    id: number;
    numeroSorteado: number;
    totalTickets: number;
    situacao: SituacaoResultadoSorteio;
    dataSorteio: Date;
    dataConfirmacaoLeitura: Date | null;
    dataLimiteRetirada: Date;
    prazoEncerrado: boolean;
    dataAtualizacao: Date;
    vencedor: {
        consumidorId: number;
        nome: string;
        email: string;
        cpfMascarado: string;
    };
}

export interface RespostaSorteio {
    id: number;
    qrcode: string | null;
    campanhaId: number;
    edicao: number;
    dataInicioEdicao: Date;
    dataFimEdicao: Date;
    valorPorTicketEdicao: number;
    /** Tickets da edição deste sorteio. */
    totalTickets: number;
    /** A edição deste sorteio já terminou (`agora > dataFimEdicao`). */
    campanhaEncerrada: boolean;
    resultadoAtual: RespostaResultadoSorteio | null;
    historico: RespostaResultadoSorteio[];
    dataCriacao: Date;
    dataAtualizacao: Date;
}
