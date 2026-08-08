type EventoProps = {
    id: number;
    nome: string;
    descricao: string | null;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Evento {
    private readonly props: EventoProps;

    constructor(props: EventoProps) {
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
