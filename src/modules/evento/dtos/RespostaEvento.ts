export interface RespostaEvento {
    id: number;
    nome: string;
    descricao: string | null;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
