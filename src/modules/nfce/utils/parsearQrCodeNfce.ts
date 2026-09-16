import { extrairChaveAcessoNfce } from "./extrairChaveAcessoNfce";
import { validarChaveAcessoNfce, ChaveAcessoNfceValidada } from "./validarChaveAcessoNfce";

export type QrCodeNfceParseado = {
    chaveValidada: ChaveAcessoNfceValidada;
    versaoQr: "2" | "3" | null;
    tipoAmbiente: "1" | "2" | null;
    /** Presente só em contingência (offline) — NÃO usar sozinho como prova fiscal. */
    valorTotalQr: number | null;
    diaEmissaoQr: string | null;
    hostPermitido: boolean;
    urlOriginal: string | null;
};

/** Domínios oficiais de consulta QR NFC-e (SP primeiro; expansível). */
export const DOMINIOS_QR_NFCE_ALLOWLIST = [
    "www.nfce.fazenda.sp.gov.br",
    "nfce.fazenda.sp.gov.br",
    "www.homologacao.nfce.fazenda.sp.gov.br",
    "homologacao.nfce.fazenda.sp.gov.br",
] as const;

function hostNaAllowlist(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return DOMINIOS_QR_NFCE_ALLOWLIST.some((d) => h === d || h.endsWith(`.${d}`));
}

function parseNumeroValorQr(raw: string | undefined): number | null {
    if (!raw || !raw.trim()) {
        return null;
    }
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
        return null;
    }
    return n;
}

/**
 * Interpreta payload de QR (URL SEFAZ, chave crua).
 * NÃO faz HTTP — evita SSRF. Apenas parsing local.
 */
export function parsearQrCodeNfce(payloadQr: string): QrCodeNfceParseado {
    const texto = payloadQr.trim();
    if (!texto) {
        throw new Error("PAYLOAD_NFCE_VAZIO");
    }

    let urlOriginal: string | null = null;
    let hostPermitido = true;
    let versaoQr: "2" | "3" | null = null;
    let tipoAmbiente: "1" | "2" | null = null;
    let valorTotalQr: number | null = null;
    let diaEmissaoQr: string | null = null;
    let parametroP: string | null = null;

    try {
        const url = new URL(texto);
        urlOriginal = url.toString();

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            throw new Error("QR_NFCE_PROTOCOLO_INVALIDO");
        }

        hostPermitido = hostNaAllowlist(url.hostname);
        if (!hostPermitido) {
            // Ainda podemos extrair a chave se estiver no texto, mas marcamos host.
            // Para provider SEFAZ SP, host fora da allowlist é rejeitado depois.
        }

        parametroP = url.searchParams.get("p") ?? url.searchParams.get("chNFe");
    } catch (erro) {
        if (erro instanceof Error && erro.message.startsWith("QR_NFCE_")) {
            throw erro;
        }
        // não é URL — chave crua ou texto
    }

    if (parametroP) {
        const campos = parametroP.split("|");
        const versao = campos[1];
        if (versao === "2" || versao === "3") {
            versaoQr = versao;
        }
        if (campos[2] === "1" || campos[2] === "2") {
            tipoAmbiente = campos[2];
        }
        // Contingência: v2 → dia(3) valor(4); v3 → dia(3) valor(4)
        if (campos.length >= 5 && (versaoQr === "2" || versaoQr === "3")) {
            diaEmissaoQr = campos[3] && /^\d{2}$/.test(campos[3]) ? campos[3] : null;
            valorTotalQr = parseNumeroValorQr(campos[4]);
        }
    }

    const chave = extrairChaveAcessoNfce(texto);
    const chaveValidada = validarChaveAcessoNfce(chave);

    return {
        chaveValidada,
        versaoQr,
        tipoAmbiente,
        valorTotalQr,
        diaEmissaoQr,
        hostPermitido: urlOriginal ? hostPermitido : true,
        urlOriginal,
    };
}
