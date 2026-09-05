export type DadosNfceLida = {
    chaveAcesso: string;
    cnpjEmitente: string;
    valorTotal: number;
    dataEmissao: Date;
    /** Sempre true no adaptador de demo — não confundir com SEFAZ. */
    modoSimulado: true;
};

export interface AdaptadorLeituraNfce {
    /**
     * Interpreta o payload do QR (URL, chave ou URI demo) e devolve dados da nota.
     * Implementações reais (SEFAZ) ficam fora do núcleo do TCC.
     */
    ler(payloadQr: string): Promise<DadosNfceLida>;
}
