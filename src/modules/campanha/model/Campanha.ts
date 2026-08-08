type CampanhaProps = {
    id: number;
    nome: string;
    descricao: string | null;
    qrcode: string | null;
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
