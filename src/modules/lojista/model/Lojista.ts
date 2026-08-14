import { StatusLojista } from "../../../generated/prisma/enums";

type LojistaProps = {
    id: number;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual: number | null;
    status: StatusLojista;
    usuarioId: number;
    associacaoId: number;
    enderecoId: number | null;
    justificativaRejeicao: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Lojista {
    private readonly props: LojistaProps;

    constructor(props: LojistaProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get nomeFantasia() {
        return this.props.nomeFantasia;
    }

    get razaoSocial() {
        return this.props.razaoSocial;
    }

    get cnpj() {
        return this.props.cnpj;
    }

    get inscricaoEstadual() {
        return this.props.inscricaoEstadual;
    }

    get status() {
        return this.props.status;
    }

    get usuarioId() {
        return this.props.usuarioId;
    }

    get associacaoId() {
        return this.props.associacaoId;
    }

    get enderecoId() {
        return this.props.enderecoId;
    }

    get justificativaRejeicao() {
        return this.props.justificativaRejeicao;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
