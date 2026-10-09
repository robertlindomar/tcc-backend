export interface RespostaAssociacao {
    id: number;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual: number | null;
    usuarioId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
