type ProdutoProps = {
    id: number;
    nome: string;
    valor: number;
    categoriaId: number | null;
    lojistaId: number;
    urlImagem?: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Produto {
    private readonly props: ProdutoProps;

    constructor(props: ProdutoProps) {
        this.props = {
            ...props,
            urlImagem: props.urlImagem ?? null,
        };
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

    get urlImagem() {
        return this.props.urlImagem ?? null;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
