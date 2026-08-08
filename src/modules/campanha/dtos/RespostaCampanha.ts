export interface RespostaCampanha {
    id: number;
    nome: string;
    descricao: string | null;
    qrcode: string | null;
    associacaoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
