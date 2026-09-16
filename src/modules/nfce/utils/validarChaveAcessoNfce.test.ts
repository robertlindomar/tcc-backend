import { describe, expect, it } from "vitest";
import {
    calcularDvChaveAcessoNfce,
    validarChaveAcessoNfce,
} from "./validarChaveAcessoNfce";
import { parsearQrCodeNfce } from "./parsearQrCodeNfce";

const CHAVE_OK = "35260838281946000146650010000042331599885707";

describe("validarChaveAcessoNfce", () => {
    it("aceita chave válida modelo 65 UF SP", () => {
        const v = validarChaveAcessoNfce(CHAVE_OK);
        expect(v.uf).toBe("SP");
        expect(v.modelo).toBe("65");
        expect(v.cnpjEmitenteDigitos).toBe("38281946000146");
    });

    it("rejeita tamanho diferente de 44", () => {
        expect(() => validarChaveAcessoNfce("123")).toThrow("CHAVE_NFCE_INVALIDA");
    });

    it("rejeita DV inválido", () => {
        const ruim = CHAVE_OK.slice(0, 43) + (CHAVE_OK[43] === "0" ? "1" : "0");
        expect(() => validarChaveAcessoNfce(ruim)).toThrow("CHAVE_NFCE_DV_INVALIDO");
    });

    it("rejeita modelo diferente de 65", () => {
        const base43 = CHAVE_OK.slice(0, 20) + "55" + CHAVE_OK.slice(22, 43);
        const chave = base43 + calcularDvChaveAcessoNfce(base43);
        expect(() => validarChaveAcessoNfce(chave)).toThrow("CHAVE_NFCE_MODELO_INVALIDO");
    });
});

describe("parsearQrCodeNfce", () => {
    it("parseia QR v2 online (chave|2|amb|csc|hash)", () => {
        const url = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE_OK}|2|1|1|ABCDEF`;
        const p = parsearQrCodeNfce(url);
        expect(p.versaoQr).toBe("2");
        expect(p.tipoAmbiente).toBe("1");
        expect(p.chaveValidada.chave).toBe(CHAVE_OK);
        expect(p.hostPermitido).toBe(true);
        expect(p.valorTotalQr).toBeNull();
    });

    it("parseia QR v3 online", () => {
        const url = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE_OK}|3|1`;
        const p = parsearQrCodeNfce(url);
        expect(p.versaoQr).toBe("3");
        expect(p.chaveValidada.uf).toBe("SP");
    });

    it("extrai valor apenas em layout de contingência (não prova fiscal)", () => {
        const url = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE_OK}|2|1|15|669.86|DIGEST|1|HASH`;
        const p = parsearQrCodeNfce(url);
        expect(p.valorTotalQr).toBe(669.86);
        expect(p.diaEmissaoQr).toBe("15");
    });

    it("marca host fora da allowlist", () => {
        const url = `https://evil.example/qr?p=${CHAVE_OK}|2|1|1|H`;
        const p = parsearQrCodeNfce(url);
        expect(p.hostPermitido).toBe(false);
        expect(p.chaveValidada.chave).toBe(CHAVE_OK);
    });
});
