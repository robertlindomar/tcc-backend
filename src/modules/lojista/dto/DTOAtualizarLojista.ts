export interface DTOAtualizarLojista {
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual?: number | null;
    /** `null` remove o vínculo; omitido mantém o atual. */
    enderecoId?: number | null;
}
