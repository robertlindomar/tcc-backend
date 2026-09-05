type CampanhaProps = {
    id: number;
    nome: string;
    descricao: string | null;
    qrcode: string | null;
    dataInicio: Date;
    dataFim: Date;
    valorPorTicket: number;
    associacaoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Campanha {
    private readonly props: CampanhaProps;

    constructor(props: CampanhaProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get nome() {
        return this.props.nome;
    }

    get descricao() {
        return this.props.descricao;
    }

    get qrcode() {
        return this.props.qrcode;
    }

    get dataInicio() {
        return this.props.dataInicio;
    }

    get dataFim() {
        return this.props.dataFim;
    }

    get valorPorTicket() {
        return this.props.valorPorTicket;
    }

    get associacaoId() {
        return this.props.associacaoId;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
