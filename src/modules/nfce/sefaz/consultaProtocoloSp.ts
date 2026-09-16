import fs from "node:fs";
import https from "node:https";
import { StatusFiscalNfce } from "../adaptador/AdaptadorNfce";
import { requisitarSefazSeguro } from "./clienteHttpSefazSeguro";
import {
    AmbienteSefaz,
    tpAmbDeAmbiente,
    WS_CONSULTA_PROTOCOLO_SP,
} from "./dominiosSefazSp";

export type ResultadoConsultaProtocolo = {
    cStat: string;
    xMotivo: string;
    chNFe: string;
    status: StatusFiscalNfce;
    protocoloAutorizacao?: string;
    dhRecbto?: string;
};

function mapearStatus(cStat: string): StatusFiscalNfce {
    switch (cStat) {
        case "100":
        case "150":
            return "AUTORIZADA";
        case "101":
        case "151":
            return "CANCELADA";
        case "110":
        case "301":
        case "302":
            return "DENEGADA";
        case "217":
            return "INEXISTENTE";
        default:
            return "DESCONHECIDO";
    }
}

function extrairTag(xml: string, tag: string): string | undefined {
    const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
    const m = xml.match(re);
    return m?.[1]?.trim();
}

function montarEnvelopeSoap(chave: string, tpAmb: "1" | "2"): string {
    const consSit = [
        `<consSitNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">`,
        `<tpAmb>${tpAmb}</tpAmb>`,
        `<xServ>CONSULTAR</xServ>`,
        `<chNFe>${chave}</chNFe>`,
        `</consSitNFe>`,
    ].join("");

    return [
        `<?xml version="1.0" encoding="utf-8"?>`,
        `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
        ` xmlns:xsd="http://www.w3.org/2001/XMLSchema"`,
        ` xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">`,
        `<soap12:Body>`,
        `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">`,
        consSit,
        `</nfeDadosMsg>`,
        `</soap12:Body>`,
        `</soap12:Envelope>`,
    ].join("");
}

export type OpcoesConsultaProtocolo = {
    ambiente: AmbienteSefaz;
    pfxPath?: string;
    passphrase?: string;
    /** Injeta agente em testes. */
    agent?: https.Agent;
    /** Injeta transporte em testes. */
    transportar?: typeof requisitarSefazSeguro;
};

/**
 * NFeConsultaProtocolo4 — somente leitura.
 * Retorna situação/protocolo. NÃO retorna vNF (valor total).
 */
export async function consultarProtocoloNfceSp(
    chaveAcesso: string,
    opcoes: OpcoesConsultaProtocolo,
): Promise<ResultadoConsultaProtocolo> {
    const chave = chaveAcesso.replace(/\D/g, "");
    if (chave.length !== 44) {
        throw new Error("CHAVE_NFCE_INVALIDA");
    }

    let agent = opcoes.agent;
    if (!agent) {
        if (!opcoes.pfxPath) {
            throw new Error("SEFAZ_CERTIFICADO_AUSENTE");
        }
        let pfx: Buffer;
        try {
            pfx = fs.readFileSync(opcoes.pfxPath);
        } catch {
            throw new Error("SEFAZ_CERTIFICADO_INVALIDO");
        }
        agent = new https.Agent({
            pfx,
            passphrase: opcoes.passphrase ?? "",
            keepAlive: false,
        });
    }

    const url = WS_CONSULTA_PROTOCOLO_SP[opcoes.ambiente];
    const body = montarEnvelopeSoap(chave, tpAmbDeAmbiente(opcoes.ambiente));
    const transportar = opcoes.transportar ?? requisitarSefazSeguro;

    let resposta;
    try {
        resposta = await transportar(url, {
            method: "POST",
            agent,
            headers: {
                "Content-Type": "application/soap+xml; charset=utf-8",
                "Content-Length": String(Buffer.byteLength(body)),
            },
            body,
        });
    } catch (erro) {
        const codigo = erro instanceof Error ? erro.message : "SEFAZ_INDISPONIVEL";
        if (
            codigo === "SEFAZ_TIMEOUT" ||
            codigo === "SEFAZ_INDISPONIVEL" ||
            codigo === "SEFAZ_HOST_NAO_PERMITIDO" ||
            codigo === "SEFAZ_IP_PRIVADO" ||
            codigo === "SEFAZ_RESPOSTA_GRANDE" ||
            codigo === "SEFAZ_REDIRECT_BLOQUEADO" ||
            codigo === "SEFAZ_PROTOCOLO_INVALIDO" ||
            codigo === "SEFAZ_DNS_FALHOU"
        ) {
            throw new Error(codigo);
        }
        throw new Error("SEFAZ_INDISPONIVEL");
    }

    if (resposta.statusCode < 200 || resposta.statusCode >= 300) {
        throw new Error("SEFAZ_INDISPONIVEL");
    }

    const xml = resposta.body.toString("utf8");
    // Nunca logar XML completo (pode conter dados sensíveis em outros serviços).
    const cStat = extrairTag(xml, "cStat");
    if (!cStat) {
        throw new Error("SEFAZ_RESPOSTA_INVALIDA");
    }

    const xMotivo = extrairTag(xml, "xMotivo") ?? "";
    const chNFe = extrairTag(xml, "chNFe") ?? chave;
    const nProt = extrairTag(xml, "nProt");
    const dhRecbto = extrairTag(xml, "dhRecbto");

    return {
        cStat,
        xMotivo,
        chNFe,
        status: mapearStatus(cStat),
        protocoloAutorizacao: nProt,
        dhRecbto,
    };
}
