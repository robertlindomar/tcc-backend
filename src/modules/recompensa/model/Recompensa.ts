type RecompensaProps = {
    id: number;
    nome: string;
    descricao: string | null;
    custoPontos: number;
    ativa: boolean;
    estoque: number | null;
    dataFim: Date | null;
    lojistaId: number;
    nomeLoja?: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Recompensa {
    private readonly props: RecompensaProps;

    constructor(props: RecompensaProps) {
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
    get custoPontos() {
        return this.props.custoPontos;
    }
    get ativa() {
        return this.props.ativa;
    }
    get estoque() {
        return this.props.estoque;
    }
    get dataFim() {
        return this.props.dataFim;
    }
    get lojistaId() {
        return this.props.lojistaId;
    }
    get nomeLoja() {
        return this.props.nomeLoja ?? null;
    }
    get dataCriacao() {
        return this.props.dataCriacao;
    }
    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
