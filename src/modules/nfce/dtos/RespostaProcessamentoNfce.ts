export type RespostaProcessamentoNfce = {
    id: number;
    campanhaId: number;
    chaveAcesso: string;
    valorNota: number;
    ticketsGerados: number;
    residualAntes: number;
    residualApos: number;
    ticketsTotaisCampanha: number;
    lojistaId: number;
    dataEmissao: Date;
    modoSimulado: true;
};
