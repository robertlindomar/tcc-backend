export type SituacaoResultadoSorteio = "AGUARDANDO_ENTREGA" | "ENTREGUE" | "CANCELADO";

export type VencedorSorteio = {
    consumidorId: number;
    nome: string;
    email: string;
    cpf: string;
};

export type ResultadoSorteio = {
    id: number;
    ticketId: number;
    numeroSorteado: number;
    totalTickets: number;
    situacao: SituacaoResultadoSorteio;
    dataSorteio: Date;
    dataConfirmacaoLeitura?: Date | null;
    dataAtualizacao: Date;
    vencedor: VencedorSorteio;
};

type SorteioProps = {
    id: number;
    qrcode: string | null;
    campanhaId: number;
    edicao: number;
    dataInicioEdicao: Date;
    /** Snapshot do fim da edição: base para liberar o sorteio. */
    dataFimEdicao: Date;
    valorPorTicketEdicao: number;
    /** Tickets da edição deste sorteio. */
    totalTickets: number;
    /** Mais recente primeiro. */
    resultados: ResultadoSorteio[];
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Sorteio {
    private readonly props: SorteioProps;

    constructor(props: SorteioProps) {
        this.props = { ...props, resultados: [...props.resultados] };
    }

    get id() {
        return this.props.id;
    }

    get qrcode() {
        return this.props.qrcode;
    }

    get campanhaId() {
        return this.props.campanhaId;
    }

    get edicao() {
        return this.props.edicao;
    }

    get dataInicioEdicao() {
        return this.props.dataInicioEdicao;
    }

    get dataFimEdicao() {
        return this.props.dataFimEdicao;
    }

    get valorPorTicketEdicao() {
        return this.props.valorPorTicketEdicao;
    }

    get totalTickets() {
        return this.props.totalTickets;
    }

    get resultados() {
        return this.props.resultados;
    }

    /** Resultado não cancelado (no máximo 1 por sorteio). */
    get resultadoAtual(): ResultadoSorteio | null {
        return this.props.resultados.find((item) => item.situacao !== "CANCELADO") ?? null;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
