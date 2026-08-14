export interface RespostaMissao {
    id: number;
    nome: string;
    descricao: string | null;
    pontoRecompensa: number;
    lojistaId: number;
    tokenQr: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
