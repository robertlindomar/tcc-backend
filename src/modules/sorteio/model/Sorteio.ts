type SorteioProps = {
    id: number;
    qrcode: string | null;
    campanhaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class Sorteio {
    private readonly props: SorteioProps;

    constructor(props: SorteioProps) {
        this.props = { ...props };
    }

    get id() {
        return this.props.id;
    }

    get qrcode() {
        return this.props.qrcode;
    }

    get campanhaId() {
        return this.props.campanhaId;
    }

    get dataCriacao() {
        return this.props.dataCriacao;
    }

    get dataAtualizacao() {
        return this.props.dataAtualizacao;
    }
}
