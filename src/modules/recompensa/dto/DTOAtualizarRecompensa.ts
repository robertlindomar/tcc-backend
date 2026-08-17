export interface DTOAtualizarRecompensa {
    nome?: string;
    descricao?: string | null;
    custoPontos?: number;
    estoque?: number | null;
    dataFim?: string | Date | null;
}
