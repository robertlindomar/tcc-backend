import { randomBytes } from "node:crypto";

/** 32 bytes → 64 hex. Não usar Math.random nem o id da missão. */
export const TAMANHO_TOKEN_QR_BYTES = 32;

export const PREFIXO_PAYLOAD_QR_MISSAO = "tcc://missao/";

export function gerarTokenQrMissao(): string {
    return randomBytes(TAMANHO_TOKEN_QR_BYTES).toString("hex");
}

/** Payload versionável, sem host/porta. */
export function montarPayloadQrMissao(tokenQr: string): string {
    return `${PREFIXO_PAYLOAD_QR_MISSAO}${tokenQr}`;
}

export function extrairTokenQrMissao(entrada: unknown): string {
    if (typeof entrada !== "string") {
        return "";
    }
    const trim = entrada.trim();
    if (trim.startsWith(PREFIXO_PAYLOAD_QR_MISSAO)) {
        return trim.slice(PREFIXO_PAYLOAD_QR_MISSAO.length).trim();
    }
    return trim;
}
