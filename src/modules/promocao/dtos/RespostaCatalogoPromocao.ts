export interface RespostaCatalogoPromocao {
    id: number;
    descricao: string | null;
    preco: number;
    produtoId: number;
    produtoNome: string;
    percentualDesconto: number | null;
    dataFim: Date;
    dataFimCivil: string;
}
