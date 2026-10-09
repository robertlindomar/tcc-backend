import { StatusResgateRecompensa } from "../../../generated/prisma/enums";

export interface RespostaResgateRecompensa {
    id: number;
    recompensaId: number;
    consumidorId: number;
    custoPontosSnapshot: number;
    nomeRecompensaSnapshot: string;
    status: StatusResgateRecompensa;
    dataEntrega: Date | null;
    dataCriacao: Date;
    nomeConsumidor?: string | null;
}
