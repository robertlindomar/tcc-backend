import { FrequenciaMissao } from "../../../generated/prisma/enums";

export interface DTOAtualizarMissao {
    nome?: string;
    descricao?: string | null;
    pontoRecompensa?: number;
    frequencia?: FrequenciaMissao;
    dataFim?: string | Date;
}
