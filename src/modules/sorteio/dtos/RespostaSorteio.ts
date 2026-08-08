export interface RespostaSorteio {
    id: number;
    qrcode: string | null;
    campanhaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
