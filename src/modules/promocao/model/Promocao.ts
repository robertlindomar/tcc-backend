type PromocaoProps = {
    id: number;
    descricao: string | null;
    preco: number;
    ativa: boolean;
    dataInicio: Date;
    dataFim: Date;
    produtoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Promocao {
    private readonly props: PromocaoProps;

    constructor(props: PromocaoProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get descricao() {
        return this.props.descricao;
    }

    get preco() {
        return this.props.preco;
    }

    get ativa() {
        return this.props.ativa;
    }

    get dataInicio() {
        return this.props.dataInicio;
    }

    get dataFim() {
        return this.props.dataFim;
    }

    get produtoId() {
        return this.props.produtoId;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
