export interface RespostaDestaqueLoja {
    id: number;
    nomeFantasia: string;
    urlLogo: string | null;
    ofertasVigentes: number;
    /** Maior desconto (%) entre as ofertas vigentes; null se nenhuma tem desconto calculável. */
    maiorDesconto: number | null;
}
