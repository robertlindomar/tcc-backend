import fs from "node:fs";
import path from "node:path";

export type DadosComplementaresNfce = {
    valorTotal: number;
    dataEmissao: Date;
    cnpjEmitenteDigitos?: string;
};

/**
 * Fonte oficial complementar para vNF/dhEmi quando ConsultaProtocolo não os traz.
 * Produção: XML autorizado do lojista (ou download com cert do próprio emitente).
 */
export interface FonteDadosComplementaresNfce {
    obterPorChave(chaveAcesso: string): Promise<DadosComplementaresNfce | null>;
}

export class FonteDadosComplementaresVazia implements FonteDadosComplementaresNfce {
    async obterPorChave(): Promise<DadosComplementaresNfce | null> {
        return null;
    }
}

/**
 * Lê XMLs `procNFe` / `nfeProc` de um diretório local (fora do Git).
 * Sanitizado: só extrai vNF, dhEmi, CNPJ emitente — sem persistir XML.
 */
export class FonteXmlDiretorioLocal implements FonteDadosComplementaresNfce {
    constructor(private readonly diretorio: string, private readonly validarIdentidade = false) {}

    async obterPorChave(chaveAcesso: string): Promise<DadosComplementaresNfce | null> {
        const chave = chaveAcesso.replace(/\D/g, "");
        if (chave.length !== 44) {
            return null;
        }

        let arquivos: string[];
        try {
            arquivos = fs.readdirSync(this.diretorio);
        } catch {
            return null;
        }

        const candidato = arquivos.find(
            (nome) => nome.includes(chave) && nome.toLowerCase().endsWith(".xml"),
        );
        if (!candidato) {
            return null;
        }

        const caminho = path.join(this.diretorio, candidato);
        let xml: string;
        try {
            xml = fs.readFileSync(caminho, "utf8");
        } catch {
            return null;
        }

        return extrairDadosDeXmlNfce(xml, chave, this.validarIdentidade);
    }
}

export function extrairDadosDeXmlNfce(
    xml: string,
    chaveEsperada?: string,
    validarIdentidade = false,
): DadosComplementaresNfce | null {
    if (validarIdentidade) {
        // Restringe os campos à mesma infNFe; nunca usa valor do QR ou do destinatário.
        const notas = [...xml.matchAll(/<infNFe\b[^>]*\bId=["']NFe(\d{44})["'][^>]*>([\s\S]*?)<\/infNFe>/g)];
        if (notas.length !== 1 || notas[0]![1] !== chaveEsperada) return null;
        const conteudo = notas[0]![2]!;
        const ide = conteudo.match(/<ide\b[^>]*>([\s\S]*?)<\/ide>/)?.[1] ?? "";
        const emit = conteudo.match(/<emit\b[^>]*>([\s\S]*?)<\/emit>/)?.[1] ?? "";
        const total = conteudo.match(/<ICMSTot\b[^>]*>([\s\S]*?)<\/ICMSTot>/)?.[1] ?? "";
        if (!/<mod>\s*65\s*<\/mod>/.test(ide)) return null;
        const cnpj = emit.match(/<CNPJ>\s*(\d{14})\s*<\/CNPJ>/)?.[1];
        const valor = total.match(/<vNF>\s*(\d+\.\d{2})\s*<\/vNF>/)?.[1];
        const emissao = ide.match(/<dhEmi>\s*([^<]+?)\s*<\/dhEmi>/)?.[1];
        if (!cnpj || !valor || !emissao) return null;
        const dataEmissao = new Date(emissao);
        if (!Number.isFinite(Number(valor)) || Number.isNaN(dataEmissao.getTime())) return null;
        return { cnpjEmitenteDigitos: cnpj, valorTotal: Number(valor), dataEmissao };
    }
    const chNFe =
        xml.match(/Id="NFe(\d{44})"/i)?.[1] ??
        xml.match(/<chNFe>(\d{44})<\/chNFe>/i)?.[1];
    if (chaveEsperada && chNFe && chNFe !== chaveEsperada) {
        return null;
    }

    const vNF = xml.match(/<vNF>([0-9]+(?:\.[0-9]+)?)<\/vNF>/i)?.[1];
    const dhEmi =
        xml.match(/<dhEmi>([^<]+)<\/dhEmi>/i)?.[1] ??
        xml.match(/<dEmi>([^<]+)<\/dEmi>/i)?.[1];
    const cnpj = xml.match(/<emit>[\s\S]*?<CNPJ>(\d{14})<\/CNPJ>/i)?.[1];

    if (!vNF || !dhEmi) {
        return null;
    }

    const valorTotal = Number(vNF);
    const dataEmissao = new Date(dhEmi);
    if (!Number.isFinite(valorTotal) || valorTotal < 0 || Number.isNaN(dataEmissao.getTime())) {
        return null;
    }

    return {
        valorTotal,
        dataEmissao,
        cnpjEmitenteDigitos: cnpj,
    };
}
