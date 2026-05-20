import { AppError } from "../../../shared/errors/AppError";

type EnderecoProps = {
    id: number;
    cep: string;
    numero: string | null;
    usuarioId: number;
    ruaId: number;
    bairroId: number;
    cidadeId: number;
    estadoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Endereco {
    private readonly props: EnderecoProps;

    constructor(props: EnderecoProps) {
        if (!props.cep.trim()) {
            throw new AppError("CEP do endereco é obrigatório");
        }

        if (!Number.isInteger(props.usuarioId) || props.usuarioId <= 0) {
            throw new AppError("ID do usuario invalido");
        }

        this.props = props;
    }

    get id() {
        return this.props.id;
    }

    get cep() {
        return this.props.cep;
    }

    get numero() {
        return this.props.numero;
    }

    get usuarioId() {
        return this.props.usuarioId;
    }

    get ruaId() {
        return this.props.ruaId;
    }

    get bairroId() {
        return this.props.bairroId;
    }

    get cidadeId() {
        return this.props.cidadeId;
    }

    get estadoId() {
        return this.props.estadoId;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
