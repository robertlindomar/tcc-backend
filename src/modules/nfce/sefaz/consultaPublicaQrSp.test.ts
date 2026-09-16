import { describe, expect, it, vi } from "vitest";
import { ConsultaPublicaQrSp, extrairDadosConsultaPublicaSp } from "./consultaPublicaQrSp";
import { AdaptadorNfceTeste } from "../adaptador/AdaptadorNfceTeste";
import { criarAdaptadorNfce } from "../factory/criarAdaptadorNfce";
import { calcularTicketsEResidual } from "../utils/calcularTicketsEResidual";

const chave = "35260822399004000631650010001161211824962233";
const url = `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=${chave}|2|1|1|hash`;
const urlCurta = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${chave}|2|1|1|hash`;
// Layout mínimo da consulta pública observada; sem dados pessoais, cookies ou scripts.
const html = `<div id="avisos"></div><div>CNPJ: 22.399.004/0006-31</div>
<table><tr><td>Vl. Total 34,42</td></tr></table>
<div id="totalNota"><label>Valor total R$:</label><span>34,42</span>
<label>Descontos R$:</label><span>12,90</span>
<label>Valor a pagar R$:</label><span class="totalNumb txtMax">21,52</span>
<label>Valor pago R$:</label><span>100,00</span></div>
<strong>Emissão: </strong>04/08/2026 17:08:15 - Via Consumidor
<strong>Protocolo de Autorização: </strong>135265282141344
<strong>Ambiente de Produção</strong><span class="chave">${chave}</span>`;

describe("Consulta pública QR SP (sem XML manual)", () => {
    it("extrai líquido após descontos, CNPJ e emissão no fuso de SP", () => {
        const dados = extrairDadosConsultaPublicaSp(html, chave);
        expect(dados).toEqual({ valorTotal: 21.52, cnpjEmitenteDigitos: "22399004000631", dataEmissao: new Date("2026-08-04T20:08:15Z") });
        expect(calcularTicketsEResidual({ valorNota: dados.valorTotal, residualAnterior: 0, valorPorTicket: 10 }))
            .toEqual({ tickets: 2, residualNovo: 1.52, totalDisponivel: 21.52 });
    });
    it("milhar e entidades HTML", () => {
        const dados = extrairDadosConsultaPublicaSp(html.replace("21,52", "1.021,52").replace("Emissão:", "Emiss&atilde;o:"), chave);
        expect(dados.valorTotal).toBe(1021.52);
    });
    it.each([
        html.replace(chave, "0".repeat(44)),
        html.replace("Valor a pagar R$:", "Total desconhecido:"),
        html.replace("21,52", "NaN"),
        html.replace("CNPJ:", "CPF:"),
        html.replace("Protocolo de Autorização:", "Protocolo:"),
        html.replace("Ambiente de Produção", "Ambiente de Homologação"),
    ])("recusa identidade ou layout incompleto sem usar valor de produtos", (pagina) => {
        expect(() => extrairDadosConsultaPublicaSp(pagina, chave)).toThrow("NFCE_CONSULTA_PUBLICA_INVALIDA");
    });
    it("não contorna CAPTCHA", () => {
        expect(() => extrairDadosConsultaPublicaSp('<div class="g-recaptcha"></div>', chave)).toThrow("NFCE_CONSULTA_CAPTCHA");
    });
    it("nota cancelada no aviso", () => {
        expect(() => extrairDadosConsultaPublicaSp(html.replace('id="avisos">', 'id="avisos">NFC-e cancelada'), chave)).toThrow("NFCE_CANCELADA");
    });
    it.each(["31/02/2026", "04/08/2026 25:08:15"])("data inválida %s", (data) => {
        const pagina = data.includes(":") ? html.replace("04/08/2026 17:08:15", data) : html.replace("04/08/2026", data);
        expect(() => extrairDadosConsultaPublicaSp(pagina, chave)).toThrow("DATA_NFCE_INVALIDA");
    });
    it("consulta no endpoint HTTPS fixo e integra ao adaptador sem XML", async () => {
        const requisitar = vi.fn().mockResolvedValue({ statusCode: 200, body: Buffer.from(html), finalUrl: url });
        const adaptador = new AdaptadorNfceTeste(undefined, new ConsultaPublicaQrSp(requisitar));
        await expect(adaptador.consultar(url.replace("https:", "http:"))).resolves.toMatchObject({ valorTotal: 21.52, provider: "teste", status: "DESCONHECIDO" });
        expect(requisitar.mock.calls[0]![0]).toMatch(/^https:\/\/www\.nfce\.fazenda\.sp\.gov\.br\/NFCeConsultaPublica\/Paginas\/ConsultaQRCode.aspx\?p=/);
    });
    it("aceita o caminho curto /qrcode impresso na NFC-e e consulta o destino canônico", async () => {
        const requisitar = vi.fn().mockResolvedValue({ statusCode: 200, body: Buffer.from(html), finalUrl: url });
        await expect(new ConsultaPublicaQrSp(requisitar).obterPorQrCode(urlCurta)).resolves.toMatchObject({
            valorTotal: 21.52,
            cnpjEmitenteDigitos: "22399004000631",
        });
        expect(requisitar.mock.calls[0]![0]).toContain("/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx");
    });
    it("CNPJ consultado diferente da chave é rejeitado", async () => {
        const requisitar = vi.fn().mockResolvedValue({ statusCode: 200, body: Buffer.from(html.replace("22.399.004/0006-31", "11.222.333/0001-81")) });
        await expect(new AdaptadorNfceTeste(undefined, new ConsultaPublicaQrSp(requisitar)).consultar(url))
            .rejects.toThrow("NFCE_CONSULTA_CNPJ_DIVERGENTE");
    });
    it.each([url.replace("www.nfce.fazenda.sp.gov.br", "evil.example"), url.replace(".aspx?", ".aspx/outro?"), url.replace(".gov.br/", ".gov.br:444/"), url.replace("https://", "https://usuario@")])("URL não permitida é bloqueada antes da rede", async (entrada) => {
        const requisitar = vi.fn();
        await expect(new ConsultaPublicaQrSp(requisitar).obterPorQrCode(entrada)).rejects.toThrow("SEFAZ_HOST_NAO_PERMITIDO");
        expect(requisitar).not.toHaveBeenCalled();
    });
    it("chave sem QR completo não basta para consulta", async () => {
        await expect(new ConsultaPublicaQrSp(vi.fn()).obterPorQrCode(chave)).rejects.toThrow("NFCE_QR_URL_OBRIGATORIA");
    });
    it("indisponibilidade da SEFAZ não vira crédito", async () => {
        const requisitar = vi.fn().mockResolvedValue({ statusCode: 503, body: Buffer.from(html) });
        await expect(new ConsultaPublicaQrSp(requisitar).obterPorQrCode(url)).rejects.toThrow("SEFAZ_INDISPONIVEL");
    });
    it("factory usa consulta pública quando não há opção explícita", async () => {
        vi.stubEnv("NFCE_TESTE_FONTE", "");
        vi.stubEnv("NODE_ENV", "test");
        try {
            await expect(criarAdaptadorNfce("teste").consultar(chave)).rejects.toThrow("NFCE_QR_URL_OBRIGATORIA");
        } finally { vi.unstubAllEnvs(); }
    });
});
