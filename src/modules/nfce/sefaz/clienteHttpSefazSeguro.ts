import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { HOSTS_SEFAZ_SP_ALLOWLIST } from "./dominiosSefazSp";

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 512_000;
const MAX_REDIRECTS = 2;

function ipPrivadoOuLocal(ip: string): boolean {
    const v = ip.toLowerCase();
    if (v === "::1" || v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd")) {
        return true;
    }
    if (v.includes(":")) {
        // IPv6 não-público conservador: bloqueia link-local/unique-local já cobertos;
        // bloqueia IPv4-mapped
        const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) {
            return ipPrivadoOuLocal(mapped[1]!);
        }
        return false;
    }
    const partes = v.split(".").map(Number);
    if (partes.length !== 4 || partes.some((n) => Number.isNaN(n))) {
        return true;
    }
    const [a, b] = partes as [number, number, number, number];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0 && partes[2] === 0) return true;
    return false;
}

export type OpcoesHttpSefazSeguro = {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string | Buffer;
    agent?: https.Agent;
    allowlistHosts?: readonly string[];
};

/**
 * HTTP(S) restrito a allowlist de hosts SEFAZ, com DNS seguro e anti-SSRF.
 * Não seguir redirects para hosts fora da allowlist.
 */
export async function requisitarSefazSeguro(
    urlString: string,
    opcoes: OpcoesHttpSefazSeguro = {},
    redirectsRestantes = MAX_REDIRECTS,
): Promise<{ statusCode: number; body: Buffer; finalUrl: string }> {
    const allowlist = opcoes.allowlistHosts ?? HOSTS_SEFAZ_SP_ALLOWLIST;
    const url = new URL(urlString);

    if (url.protocol !== "https:") {
        throw new Error("SEFAZ_PROTOCOLO_INVALIDO");
    }

    const host = url.hostname.toLowerCase();
    if (!allowlist.includes(host)) {
        throw new Error("SEFAZ_HOST_NAO_PERMITIDO");
    }

    if (isIP(host)) {
        if (ipPrivadoOuLocal(host)) {
            throw new Error("SEFAZ_IP_PRIVADO");
        }
    } else {
        let registros: string[];
        try {
            registros = await dns.resolve4(host);
        } catch {
            try {
                const v6 = await dns.resolve6(host);
                registros = v6;
            } catch {
                throw new Error("SEFAZ_DNS_FALHOU");
            }
        }
        if (registros.length === 0 || registros.some(ipPrivadoOuLocal)) {
            throw new Error("SEFAZ_IP_PRIVADO");
        }
    }

    return new Promise((resolve, reject) => {
        const lib = url.protocol === "https:" ? https : http;
        const req = lib.request(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port || 443,
                path: `${url.pathname}${url.search}`,
                method: opcoes.method ?? "GET",
                headers: opcoes.headers,
                agent: opcoes.agent,
                timeout: TIMEOUT_MS,
                servername: url.hostname,
            },
            (res) => {
                const status = res.statusCode ?? 0;
                if (
                    status >= 300 &&
                    status < 400 &&
                    res.headers.location &&
                    redirectsRestantes > 0
                ) {
                    const next = new URL(res.headers.location, url).toString();
                    res.resume();
                    requisitarSefazSeguro(next, opcoes, redirectsRestantes - 1)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                if (status >= 300 && status < 400) {
                    reject(new Error("SEFAZ_REDIRECT_BLOQUEADO"));
                    return;
                }

                const chunks: Buffer[] = [];
                let total = 0;
                res.on("data", (chunk: Buffer) => {
                    total += chunk.length;
                    if (total > MAX_BYTES) {
                        req.destroy();
                        reject(new Error("SEFAZ_RESPOSTA_GRANDE"));
                        return;
                    }
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    resolve({
                        statusCode: status,
                        body: Buffer.concat(chunks),
                        finalUrl: url.toString(),
                    });
                });
            },
        );

        req.on("timeout", () => {
            req.destroy();
            reject(new Error("SEFAZ_TIMEOUT"));
        });
        req.on("error", () => {
            reject(new Error("SEFAZ_INDISPONIVEL"));
        });

        if (opcoes.body) {
            req.write(opcoes.body);
        }
        req.end();
    });
}
