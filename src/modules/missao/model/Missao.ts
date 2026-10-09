import { FrequenciaMissao } from "../../../generated/prisma/enums";

type MissaoProps = {
    id: number;
    nome: string;
    descricao: string | null;
    pontoRecompensa: number;
    frequencia: FrequenciaMissao;
    dataFim: Date | null;
    sistema: boolean;
    lojistaId: number;
    tokenQr: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Missao {
    private readonly props: MissaoProps;

    constructor(props: MissaoProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get nome() {
        return this.props.nome;
    }

    get descricao() {
        return this.props.descricao;
    }

    get pontoRecompensa() {
        return this.props.pontoRecompensa;
    }

    get frequencia() {
        return this.props.frequencia;
    }

    get dataFim() {
        return this.props.dataFim;
    }

    get sistema() {
        return this.props.sistema;
    }

    get lojistaId() {
        return this.props.lojistaId;
    }

    get tokenQr() {
        return this.props.tokenQr;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
