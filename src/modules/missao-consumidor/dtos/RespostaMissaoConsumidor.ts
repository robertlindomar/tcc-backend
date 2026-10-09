export interface RespostaMissaoConsumidor {
    id: number;
    missaoId: number;
    consumidorId: number;
    chavePeriodo: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
    nomeMissao?: string | null;
    pontoRecompensa?: number | null;
}
