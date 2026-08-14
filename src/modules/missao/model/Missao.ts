type MissaoProps = {
    id: number;
    nome: string;
    descricao: string | null;
    pontoRecompensa: number;
    lojistaId: number;
    tokenQr: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Missao {
    private readonly props: MissaoProps;

    constructor(props: MissaoProps) {
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

    get pontoRecompensa() {
        return this.props.pontoRecompensa;
    }

    get lojistaId() {
        return this.props.lojistaId;
    }

    get tokenQr() {
        return this.props.tokenQr;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
