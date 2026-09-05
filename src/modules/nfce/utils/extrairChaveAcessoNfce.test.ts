import { describe, expect, it } from "vitest";
import {
    extrairChaveAcessoNfce,
    extrairCnpjDaChaveAcesso,
    formatarCnpj,
} from "./extrairChaveAcessoNfce";

const CHAVE = "35260944444444000144650010000000011123456780";

describe("extrairChaveAcessoNfce", () => {
    it("aceita chave crua de 44 digitos", () => {
        expect(extrairChaveAcessoNfce(CHAVE)).toBe(CHAVE);
    });

    it("extrai chave do parametro p= de URL fazenda", () => {
        const url = `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${CHAVE}|2|1|1|ABCDEF`;
        expect(extrairChaveAcessoNfce(url)).toBe(CHAVE);
    });

    it("extrai chave embutida em texto", () => {
        expect(extrairChaveAcessoNfce(`nota ${CHAVE} ok`)).toBe(CHAVE);
    });

    it("falha sem chave", () => {
        expect(() => extrairChaveAcessoNfce("sem-chave")).toThrow("CHAVE_NFCE_NAO_ENCONTRADA");
    });
});

describe("extrairCnpjDaChaveAcesso", () => {
    it("le CNPJ das posicoes 7-20", () => {
        expect(extrairCnpjDaChaveAcesso(CHAVE)).toBe("44444444000144");
        expect(formatarCnpj(extrairCnpjDaChaveAcesso(CHAVE))).toBe("44.444.444/0001-44");
    });
});
