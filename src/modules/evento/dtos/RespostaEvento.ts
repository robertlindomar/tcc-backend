export interface RespostaEvento {
    id: number;
    nome: string;
    descricao: string | null;
    lojistaId: number;
    urlImagem: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
