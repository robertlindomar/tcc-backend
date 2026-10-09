export interface RespostaProduto {
    id: number;
    nome: string;
    /** number — Decimal Prisma serializado via Number() */
    valor: number;
    categoriaId: number | null;
    lojistaId: number;
    urlImagem: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
