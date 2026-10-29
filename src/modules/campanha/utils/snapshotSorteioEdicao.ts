import { decimalParaNumero } from "../../../shared/utils/decimalParaNumero";

/** Dados do sorteio de uma edição: snapshot do período/valor da campanha naquele momento. */
export function snapshotSorteioEdicao(campanha: {
    id: number;
    edicao?: number;
    dataInicio: Date;
    dataFim: Date;
    valorPorTicket: { toString(): string } | number;
}) {
    return {
        campanhaId: campanha.id,
        edicao: campanha.edicao ?? 1,
        dataInicioEdicao: campanha.dataInicio,
        dataFimEdicao: campanha.dataFim,
        valorPorTicketEdicao: decimalParaNumero(campanha.valorPorTicket),
    };
}
