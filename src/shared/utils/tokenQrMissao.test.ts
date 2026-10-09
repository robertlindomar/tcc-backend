import { describe, expect, it } from "vitest";
import {
    PREFIXO_PAYLOAD_QR_MISSAO,
    extrairTokenQrMissao,
    gerarTokenQrMissao,
    montarPayloadQrMissao,
} from "./tokenQrMissao";

describe("tokenQrMissao", () => {
    it("gera token hex de 64 caracteres e nao repetido", () => {
        const a = gerarTokenQrMissao();
        const b = gerarTokenQrMissao();
        expect(a).toMatch(/^[0-9a-f]{64}$/);
        expect(b).toMatch(/^[0-9a-f]{64}$/);
        expect(a).not.toBe(b);
    });

    it("monta e extrai payload tcc://missao/<token>", () => {
        const token = "ab".repeat(32);
        const payload = montarPayloadQrMissao(token);
        expect(payload).toBe(`${PREFIXO_PAYLOAD_QR_MISSAO}${token}`);
        expect(extrairTokenQrMissao(payload)).toBe(token);
        expect(extrairTokenQrMissao(`  ${token}  `)).toBe(token);
    });
});
