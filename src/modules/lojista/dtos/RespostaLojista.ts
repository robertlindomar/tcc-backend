import { StatusLojista } from "../../../generated/prisma/enums";

export interface RespostaLojista {
    id: number;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual: number | null;
    status: StatusLojista;
    usuarioId: number;
    associacaoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
