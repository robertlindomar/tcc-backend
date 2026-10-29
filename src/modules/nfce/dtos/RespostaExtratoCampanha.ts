import { NotaExtratoConsumidor } from "../repository/RepositorioProcessamentoNfce";

/** Extrato do consumidor logado na edição atual de uma campanha. */
export type RespostaExtratoCampanha = {
    campanhaId: number;
    edicao: number;
    valorPorTicket: number;
    totalTickets: number;
    valorResidual: number;
    /** Quanto falta em compras para o próximo ticket. */
    faltaParaProximoTicket: number;
    notas: NotaExtratoConsumidor[];
};
