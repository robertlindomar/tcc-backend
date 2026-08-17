import { FrequenciaMissao } from "../../../generated/prisma/enums";

export interface RespostaMissao {
    id: number;
    nome: string;
    descricao: string | null;
    pontoRecompensa: number;
    frequencia: FrequenciaMissao;
    dataFim: Date | null;
    dataFimCivil: string | null;
    expirada: boolean;
    lojistaId: number;
    tokenQr: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
