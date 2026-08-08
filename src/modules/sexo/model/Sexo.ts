import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";

type SexoProps = {
    id: number;
    nome: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Sexo {
    private readonly props: SexoProps;

    constructor(props: SexoProps) {
        if (!props.nome.trim()) {
            throw new ErroAplicacao("Nome do sexo é obrigatório");
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

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
