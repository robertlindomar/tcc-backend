import { FrequenciaMissao } from "../../../generated/prisma/enums";

export interface RespostaCatalogoMissao {
    id: number;
    nome: string;
    descricao: string | null;
    pontoRecompensa: number;
    frequencia: FrequenciaMissao;
    sistema: boolean;
}
