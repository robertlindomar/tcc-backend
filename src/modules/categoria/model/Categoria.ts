import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";

type CategoriaProps = {
    id: number;
    nome: string;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Categoria {
    private readonly props: CategoriaProps;

    constructor(props: CategoriaProps) {
        if (!props.nome.trim()) {
            throw new ErroAplicacao("Nome da categoria e obrigatorio");
        }

        this.props = {
            ...props,
            nome: props.nome.trim(),
        };
    }

    get id() {
        return this.props.id;
    }

    get nome() {
        return this.props.nome;
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
