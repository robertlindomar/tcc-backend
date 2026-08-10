type MissaoConsumidorProps = {
    id: number;
    missaoId: number;
    consumidorId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
    nomeMissao?: string | null;
    pontoRecompensa?: number | null;
};

export class MissaoConsumidor {
    private readonly props: MissaoConsumidorProps;

    constructor(props: MissaoConsumidorProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get missaoId() {
        return this.props.missaoId;
    }

    get consumidorId() {
        return this.props.consumidorId;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }

    get nomeMissao() {
        return this.props.nomeMissao ?? null;
    }

    get pontoRecompensa() {
        return this.props.pontoRecompensa ?? null;
    }
}
