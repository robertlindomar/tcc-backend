type ProdutoProps = {
    id: number;
    nome: string;
    valor: number;
    categoriaId: number | null;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Produto {
    private readonly props: ProdutoProps;

    constructor(props: ProdutoProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get nome() {
        return this.props.nome;
    }

    get valor() {
        return this.props.valor;
    }

    get categoriaId() {
        return this.props.categoriaId;
    }

    get lojistaId() {
        return this.props.lojistaId;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
