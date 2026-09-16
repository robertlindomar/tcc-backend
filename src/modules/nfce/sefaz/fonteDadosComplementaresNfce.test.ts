import { describe, expect, it } from "vitest";
import { extrairDadosDeXmlNfce } from "./fonteDadosComplementaresNfce";

describe("extrairDadosDeXmlNfce", () => {
    it("extrai vNF e dhEmi de XML sanitizado", () => {
        const xml = `<?xml version="1.0"?>
<nfeProc>
  <NFe><infNFe Id="NFe35260838281946000146650010000042331599885707">
    <ide><dhEmi>2026-08-15T14:22:03-03:00</dhEmi></ide>
    <emit><CNPJ>38281946000146</CNPJ></emit>
    <total><ICMSTot><vNF>669.86</vNF></ICMSTot></total>
  </infNFe></NFe>
</nfeProc>`;
        const dados = extrairDadosDeXmlNfce(
            xml,
            "35260838281946000146650010000042331599885707",
        );
        expect(dados?.valorTotal).toBe(669.86);
        expect(dados?.cnpjEmitenteDigitos).toBe("38281946000146");
        expect(dados?.dataEmissao).toBeInstanceOf(Date);
    });

    it("rejeita chave divergente", () => {
        const xml = `<infNFe Id="NFe35260838281946000146650010000042331599885707"><vNF>10.00</vNF><dhEmi>2026-01-01T00:00:00Z</dhEmi></infNFe>`;
        expect(extrairDadosDeXmlNfce(xml, "35260944444444000144650010000000011123456788")).toBeNull();
    });
});
