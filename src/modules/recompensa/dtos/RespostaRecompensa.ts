export interface RespostaRecompensa {
    id: number;
    nome: string;
    descricao: string | null;
    custoPontos: number;
    ativa: boolean;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
