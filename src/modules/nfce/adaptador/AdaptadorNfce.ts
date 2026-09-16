/**
 * Contrato de consulta NFC-e.
 * Implementações: AdaptadorNfceSimulado | AdaptadorNfceSefaz.
 */

export type StatusFiscalNfce =
    | "AUTORIZADA"
    | "CANCELADA"
    | "DENEGADA"
    | "INEXISTENTE"
    | "DESCONHECIDO";

export type AmbienteNfce = "HOMOLOGACAO" | "PRODUCAO" | "DEMO";

export type ProviderNfce = "simulado" | "sefaz";

/**
 * Resultado canônico após leitura/consulta.
 * valorTotal/dataEmissao podem ser null quando a fonte oficial não os fornece
 * (ex.: só ConsultaProtocolo) — o serviço NÃO deve inventar esses campos.
 */
export type NfceConsultada = {
    chaveAcesso: string;
    cnpjEmitente: string;
    /** null = indisponível na fonte consultada (não inventar). */
    valorTotal: number | null;
    /** null = indisponível na fonte consultada (não inventar). */
    dataEmissao: Date | null;
    status: StatusFiscalNfce;
    uf: string;
    modelo: 65;
    ambiente: AmbienteNfce;
    provider: ProviderNfce;
    protocoloAutorizacao?: string;
    cStat?: string;
};

/** @deprecated Preferir NfceConsultada — mantido para compat dos testes demo. */
export type DadosNfceLida = {
    chaveAcesso: string;
    cnpjEmitente: string;
    valorTotal: number;
    dataEmissao: Date;
    modoSimulado: true;
};

export interface AdaptadorNfce {
    consultar(payloadQr: string): Promise<NfceConsultada>;
}

/** Alias histórico usado pelo simulado/factory antiga. */
export type AdaptadorLeituraNfce = AdaptadorNfce;
