import { StatusResgateRecompensa } from "../../../generated/prisma/enums";

type ResgateRecompensaProps = {
    id: number;
    recompensaId: number;
    consumidorId: number;
    custoPontosSnapshot: number;
    nomeRecompensaSnapshot: string;
    status: StatusResgateRecompensa;
    dataEntrega: Date | null;
    dataCriacao: Date;
    nomeConsumidor?: string | null;
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
    get status() {
        return this.props.status;
    }
    get dataEntrega() {
        return this.props.dataEntrega;
    }
    get dataCriacao() {
        return this.props.dataCriacao;
    }
    get nomeConsumidor() {
        return this.props.nomeConsumidor ?? null;
    }
}
