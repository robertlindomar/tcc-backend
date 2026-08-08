export interface RespostaPromocao {
    id: number;
    descricao: string | null;
    /** number — Decimal Prisma serializado via Number() */
    preco: number;
    produtoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
