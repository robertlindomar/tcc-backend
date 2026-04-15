import { AppError } from "../../../shared/errors/AppError";

type EstadoProps = {
    id: number;
    nome: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Estado {
    private readonly props: EstadoProps;

    constructor(props: EstadoProps) {
        if (!props.nome.trim()) {
            throw new AppError("Nome do estado é obrigatório");
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
