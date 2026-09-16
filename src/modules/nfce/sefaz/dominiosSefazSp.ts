/** Endpoints oficiais SEFAZ-SP — somente leitura nesta fatia. */

export type AmbienteSefaz = "homologacao" | "producao";

export const WS_CONSULTA_PROTOCOLO_SP: Record<AmbienteSefaz, string> = {
    homologacao:
        "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx",
    producao: "https://nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx",
};

export const HOSTS_SEFAZ_SP_ALLOWLIST = [
    "homologacao.nfce.fazenda.sp.gov.br",
    "nfce.fazenda.sp.gov.br",
    "www.homologacao.nfce.fazenda.sp.gov.br",
    "www.nfce.fazenda.sp.gov.br",
] as const;

export function tpAmbDeAmbiente(ambiente: AmbienteSefaz): "1" | "2" {
    return ambiente === "producao" ? "1" : "2";
}
