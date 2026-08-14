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
    enderecoId: number | null;
    justificativaRejeicao: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
