type AssociacaoProps = {
    id: number;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual: number | null;
    usuarioId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Associacao {
    private readonly props: AssociacaoProps;

    constructor(props: AssociacaoProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get nomeFantasia() {
        return this.props.nomeFantasia;
    }

    get razaoSocial() {
        return this.props.razaoSocial;
    }

    get cnpj() {
        return this.props.cnpj;
    }

    get inscricaoEstadual() {
        return this.props.inscricaoEstadual;
    }

    get usuarioId() {
        return this.props.usuarioId;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
