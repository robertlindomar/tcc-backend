/**
 * Rate limit em memória para POST /nfce/processar.
 * Evita uso do endpoint como proxy aberto à SEFAZ.
 */

type Entrada = { count: number; resetAt: number };

const porUsuario = new Map<string, Entrada>();
const porIp = new Map<string, Entrada>();
const porChave = new Map<string, Entrada>();

const JANELA_MS = 60_000;
const MAX_POR_USUARIO = 20;
const MAX_POR_IP = 40;
const MAX_POR_CHAVE = 5;

function tocar(mapa: Map<string, Entrada>, chave: string, max: number): boolean {
    const agora = Date.now();
    const atual = mapa.get(chave);
    if (!atual || atual.resetAt <= agora) {
        mapa.set(chave, { count: 1, resetAt: agora + JANELA_MS });
        return true;
    }
    if (atual.count >= max) {
        return false;
    }
    atual.count += 1;
    return true;
}

/** Extrai até 44 dígitos do payload para limitar por chave sem parse completo. */
export function extrairChaveParaRateLimit(payloadQr: string): string | null {
    const m = payloadQr.replace(/\D/g, "").match(/\d{44}/);
    return m?.[0] ?? null;
}

export function verificarRateLimitNfce(entrada: {
    usuarioId: number;
    ip: string;
    payloadQr: string;
}): { ok: true } | { ok: false; motivo: string } {
    if (!tocar(porUsuario, `u:${entrada.usuarioId}`, MAX_POR_USUARIO)) {
        return { ok: false, motivo: "RATE_LIMIT_USUARIO" };
    }
    if (!tocar(porIp, `ip:${entrada.ip || "desconhecido"}`, MAX_POR_IP)) {
        return { ok: false, motivo: "RATE_LIMIT_IP" };
    }
    const chave = extrairChaveParaRateLimit(entrada.payloadQr);
    if (chave && !tocar(porChave, `ch:${chave}`, MAX_POR_CHAVE)) {
        return { ok: false, motivo: "RATE_LIMIT_CHAVE" };
    }
    return { ok: true };
}

/** Só para testes. */
export function _resetRateLimitNfceParaTestes(): void {
    porUsuario.clear();
    porIp.clear();
    porChave.clear();
}
