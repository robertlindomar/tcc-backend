import { describe, expect, it } from "vitest";
import { requisitarSefazSeguro } from "./clienteHttpSefazSeguro";

describe("clienteHttpSefazSeguro (anti-SSRF)", () => {
    it("bloqueia protocolo diferente de https", async () => {
        await expect(
            requisitarSefazSeguro("http://nfce.fazenda.sp.gov.br/ws/x"),
        ).rejects.toThrow("SEFAZ_PROTOCOLO_INVALIDO");
    });

    it("bloqueia host fora da allowlist", async () => {
        await expect(requisitarSefazSeguro("https://evil.example/api")).rejects.toThrow(
            "SEFAZ_HOST_NAO_PERMITIDO",
        );
    });

    it("bloqueia localhost", async () => {
        await expect(requisitarSefazSeguro("https://127.0.0.1/ws")).rejects.toThrow(
            "SEFAZ_HOST_NAO_PERMITIDO",
        );
    });

    it("bloqueia IP privado mesmo se hostname for IP allowlist forçada", async () => {
        await expect(
            requisitarSefazSeguro("https://10.0.0.1/ws", {
                allowlistHosts: ["10.0.0.1"],
            }),
        ).rejects.toThrow("SEFAZ_IP_PRIVADO");
    });
});
