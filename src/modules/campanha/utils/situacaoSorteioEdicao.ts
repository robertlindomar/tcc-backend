import { SituacaoResultadoSorteio } from "../../../generated/prisma/enums";
import { SituacaoSorteioEdicao } from "../dtos/RespostaCampanha";

export function situacaoSorteioEdicao(dados: {
    periodoEncerrado: boolean;
    totalTickets: number;
    situacaoResultado: SituacaoResultadoSorteio | null;
}): SituacaoSorteioEdicao {
    if (dados.situacaoResultado === "ENTREGUE") {
        return "ENTREGUE";
    }
    if (dados.situacaoResultado === "AGUARDANDO_ENTREGA") {
        return "AGUARDANDO_ENTREGA";
    }
    if (!dados.periodoEncerrado) {
        return "AGUARDANDO_ENCERRAMENTO";
    }
    return dados.totalTickets > 0 ? "PRONTO_PARA_SORTEAR" : "SEM_TICKETS";
}
