import { StatusLojista } from "../../../generated/prisma/enums";

export interface RespostaLojista {
    id: number;
    nomeFantasia: string;
    urlLogo: string | null;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual: number | null;
    status: StatusLojista;
    usuarioId: number;
    email: string;
    associacaoId: number;
    enderecoId: number | null;
    justificativaRejeicao: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
