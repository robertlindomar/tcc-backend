export interface RespostaMissao {
    id: number;
    nome: string;
    descricao: string | null;
    pontoRecompensa: number;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
