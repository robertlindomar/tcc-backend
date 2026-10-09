export interface DTOCriarLojista {
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual?: number | null;
    /** Se omitido, usa o Endereco 1:1 do usuário lojista (quando existir). */
    enderecoId?: number | null;
}
