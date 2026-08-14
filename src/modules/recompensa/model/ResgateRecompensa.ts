type ResgateRecompensaProps = {
    id: number;
    recompensaId: number;
    consumidorId: number;
    custoPontosSnapshot: number;
    nomeRecompensaSnapshot: string;
    dataCriacao: Date;
};

export class ResgateRecompensa {
    private readonly props: ResgateRecompensaProps;

    constructor(props: ResgateRecompensaProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }
    get recompensaId() {
        return this.props.recompensaId;
    }
    get consumidorId() {
        return this.props.consumidorId;
    }
    get custoPontosSnapshot() {
        return this.props.custoPontosSnapshot;
    }
    get nomeRecompensaSnapshot() {
        return this.props.nomeRecompensaSnapshot;
    }
    get dataCriacao() {
        return this.props.dataCriacao;
    }
}
