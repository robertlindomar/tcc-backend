import { FrequenciaMissao } from "../../../generated/prisma/enums";

export interface DTOCriarMissao {
    nome: string;
    descricao?: string | null;
    pontoRecompensa: number;
    frequencia: FrequenciaMissao;
    dataFim: string | Date;
}
