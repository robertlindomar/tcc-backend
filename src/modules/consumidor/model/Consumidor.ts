type ConsumidorProps = {
    id: number;
    cpf: string;
    pontos: number;
    nivel: number;
    sexoId: number | null;
    lojistaId: number | null;
    usuarioId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Consumidor {
    private readonly props: ConsumidorProps;

    constructor(props: ConsumidorProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get cpf() {
        return this.props.cpf;
    }

    get pontos() {
        return this.props.pontos;
    }

    get nivel() {
        return this.props.nivel;
    }

    get sexoId() {
        return this.props.sexoId;
    }

    get lojistaId() {
        return this.props.lojistaId;
    }

    get usuarioId() {
        return this.props.usuarioId;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
