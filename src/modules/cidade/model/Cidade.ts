import { AppError } from "../../../shared/errors/AppError";

type CidadeProps = {
    id: number;
    nome: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Cidade {
    private readonly props: CidadeProps;

    constructor(props: CidadeProps) {
        if (!props.nome.trim()) {
            throw new AppError("Nome da cidade é obrigatório");
        }

        this.props = props;
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
