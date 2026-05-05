import { AppError } from "../../../shared/errors/AppError";

type BairroProps = {
    id: number;
    nome: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Bairro {
    private readonly props: BairroProps;

    constructor(props: BairroProps) {
        if (!props.nome.trim()) {
            throw new AppError("Nome do bairro é obrigatório");
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
