import { civilNoFuso, instanteCivilNoFuso, parseDataCivil } from "../../../shared/tempo/fusoNegocio";
import { parsearQrCodeNfce } from "../utils/parsearQrCodeNfce";
import { DadosComplementaresNfce } from "./fonteDadosComplementaresNfce";
import { requisitarSefazSeguro } from "./clienteHttpSefazSeguro";

const HOSTS = ["www.nfce.fazenda.sp.gov.br", "nfce.fazenda.sp.gov.br"] as const;
const CAMINHO = "/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx";
const CAMINHOS_QR_ACEITOS = [CAMINHO.toLowerCase(), "/qrcode"] as const;

function textoHtml(html: string): string {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/&#(\d+);/g, (_, numero) => String.fromCharCode(Number(numero)))
        .replace(/&atilde;/gi, "ã").replace(/&ccedil;/gi, "ç")
        .replace(/&aacute;/gi, "á").replace(/&oacute;/gi, "ó")
        .replace(/\s+/g, " ").trim();
}

/** Parser do layout observado em ConsultaQRCode SP. Layout incompleto falha sem crédito. */
export function extrairDadosConsultaPublicaSp(html: string, chaveEsperada: string): DadosComplementaresNfce {
    if (/<(?:input|div|iframe)\b[^>]*(?:captcha|recaptcha|hcaptcha)/i.test(html)) {
        throw new Error("NFCE_CONSULTA_CAPTCHA");
    }
    const avisos = textoHtml(html.match(/<div\b[^>]*id=["']avisos["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "");
    if (/cancelad/i.test(avisos)) throw new Error("NFCE_CANCELADA");
    if (avisos) throw new Error("NFCE_CONSULTA_PUBLICA_INVALIDA");
    const chave = textoHtml(html.match(/<span\b[^>]*class=["']chave["'][^>]*>([^<]*)<\/span>/i)?.[1] ?? "").replace(/\s/g, "");
    if (chave !== chaveEsperada) throw new Error("NFCE_CONSULTA_PUBLICA_INVALIDA");

    const cabecalho = textoHtml(html.split(/<table\b/i)[0] ?? "");
    const cnpj = cabecalho.match(/CNPJ:\s*([\d.\/-]+)/i)?.[1]?.replace(/\D/g, "");
    const valorTexto = html.match(/<label>\s*Valor a pagar R\$:\s*<\/label>\s*<span\b[^>]*>([^<]+)<\/span>/i)?.[1]?.trim();
    // A página chama a soma dos produtos de "Valor total". Crédito usa o total líquido
    // "Valor a pagar", depois de descontos, nunca soma de produtos/pagamentos/troco.
    if (!cnpj || !valorTexto || !/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/.test(valorTexto)) {
        throw new Error("NFCE_CONSULTA_PUBLICA_INVALIDA");
    }
    const texto = textoHtml(html);
    const emissao = texto.match(/Emissão:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/i);
    if (!emissao || !/Protocolo de Autorização:\s*\d{15}\b/i.test(texto) || !/Ambiente de Produção/i.test(texto)) {
        throw new Error("NFCE_CONSULTA_PUBLICA_INVALIDA");
    }
    const civil = parseDataCivil(`${emissao[3]}-${emissao[2]}-${emissao[1]}`);
    const hora = Number(emissao[4]), minuto = Number(emissao[5]), segundo = Number(emissao[6]);
    if (!civil || hora > 23 || minuto > 59 || segundo > 59) throw new Error("DATA_NFCE_INVALIDA");
    const instante = { ...civil, hora, minuto, segundo };
    const dataEmissao = instanteCivilNoFuso(instante, "America/Sao_Paulo");
    const conferida = civilNoFuso(dataEmissao, "America/Sao_Paulo");
    if (Object.keys(instante).some(campo => instante[campo as keyof typeof instante] !== conferida[campo as keyof typeof instante])) {
        throw new Error("DATA_NFCE_INVALIDA");
    }
    const valorTotal = Number(valorTexto.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valorTotal)) throw new Error("VALOR_NFCE_INVALIDO");
    return { cnpjEmitenteDigitos: cnpj, valorTotal, dataEmissao };
}

/** Consulta pública somente leitura, sem cookies, CAPTCHA solver ou XML manual. */
export class ConsultaPublicaQrSp {
    constructor(private readonly requisitar = requisitarSefazSeguro) {}

    async obterPorQrCode(payloadQr: string): Promise<DadosComplementaresNfce> {
        const { chaveValidada, urlOriginal } = parsearQrCodeNfce(payloadQr);
        if (!urlOriginal) throw new Error("NFCE_QR_URL_OBRIGATORIA");
        const url = new URL(urlOriginal);
        if (!HOSTS.some(host => host === url.hostname) || url.username || url.password ||
            (url.port && url.port !== "443") ||
            !CAMINHOS_QR_ACEITOS.includes(url.pathname.toLowerCase() as typeof CAMINHOS_QR_ACEITOS[number])) {
            throw new Error("SEFAZ_HOST_NAO_PERMITIDO");
        }
        if (chaveValidada.uf !== "SP") throw new Error("NFCE_UF_NAO_SUPORTADA");
        const parametro = url.searchParams.get("p");
        if (!parametro || parametro.split("|")[0] !== chaveValidada.chave || parametro.length > 2048) {
            throw new Error("NFCE_QR_URL_OBRIGATORIA");
        }
        // QR impresso pode usar HTTP; destino de rede sempre HTTPS no endpoint conhecido.
        const destino = new URL(`https://www.nfce.fazenda.sp.gov.br${CAMINHO}`);
        destino.searchParams.set("p", parametro);
        const resposta = await this.requisitar(destino.toString(), {
            allowlistHosts: HOSTS,
            headers: { Accept: "text/html", "Accept-Encoding": "identity", "User-Agent": "ConectaComercio-NfceTeste/1.0" },
        });
        if (resposta.statusCode !== 200) throw new Error("SEFAZ_INDISPONIVEL");
        return extrairDadosConsultaPublicaSp(resposta.body.toString("utf8"), chaveValidada.chave);
    }
}
