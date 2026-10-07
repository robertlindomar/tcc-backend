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
    totalTickets: number;
    campanhaEncerrada: boolean;
    resultadoAtual: RespostaResultadoSorteio | null;
    historico: RespostaResultadoSorteio[];
    dataCriacao: Date;
    dataAtualizacao: Date;
}
