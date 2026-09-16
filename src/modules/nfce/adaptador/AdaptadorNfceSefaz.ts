import { AdaptadorNfce, AmbienteNfce, NfceConsultada } from "./AdaptadorNfce";
import { formatarCnpj } from "../utils/extrairChaveAcessoNfce";
import { parsearQrCodeNfce } from "../utils/parsearQrCodeNfce";
import {
    AmbienteSefaz,
    tpAmbDeAmbiente,
} from "../sefaz/dominiosSefazSp";
import { consultarProtocoloNfceSp } from "../sefaz/consultaProtocoloSp";
import {
    FonteDadosComplementaresNfce,
    FonteDadosComplementaresVazia,
} from "../sefaz/fonteDadosComplementaresNfce";

export type OpcoesAdaptadorNfceSefaz = {
    ambiente: AmbienteSefaz;
    ufsSuportadas?: readonly string[];
    pfxPath?: string;
    passphrase?: string;
    fonteComplementar?: FonteDadosComplementaresNfce;
    /** Testes: substitui chamada SOAP. */
    consultarProtocolo?: typeof consultarProtocoloNfceSp;
};

/**
 * Consulta oficial somente leitura (SP primeiro).
 * Não faz scraping da consulta pública.
 * valorTotal/dataEmissao vêm da fonte complementar (XML do lojista),
 * nunca inventados a partir do QR online.
 */
export class AdaptadorNfceSefaz implements AdaptadorNfce {
    private readonly ufsSuportadas: readonly string[];
    private readonly fonteComplementar: FonteDadosComplementaresNfce;
    private readonly consultarProtocolo: typeof consultarProtocoloNfceSp;

    constructor(private readonly opcoes: OpcoesAdaptadorNfceSefaz) {
        this.ufsSuportadas = opcoes.ufsSuportadas ?? ["SP"];
        this.fonteComplementar =
            opcoes.fonteComplementar ?? new FonteDadosComplementaresVazia();
        this.consultarProtocolo = opcoes.consultarProtocolo ?? consultarProtocoloNfceSp;
    }

    async consultar(payloadQr: string): Promise<NfceConsultada> {
        const texto = payloadQr.trim();
        if (!texto) {
            throw new Error("PAYLOAD_NFCE_VAZIO");
        }
        if (texto.startsWith("tcc://")) {
            throw new Error("NFCE_PROVIDER_DEMO_SOMENTE_SIMULADO");
        }

        const parseado = parsearQrCodeNfce(texto);
        if (parseado.urlOriginal && !parseado.hostPermitido) {
            throw new Error("SEFAZ_HOST_NAO_PERMITIDO");
        }

        const { chaveValidada } = parseado;
        if (!this.ufsSuportadas.includes(chaveValidada.uf)) {
            throw new Error("NFCE_UF_NAO_SUPORTADA");
        }

        const protocolo = await this.consultarProtocolo(chaveValidada.chave, {
            ambiente: this.opcoes.ambiente,
            pfxPath: this.opcoes.pfxPath,
            passphrase: this.opcoes.passphrase,
        });

        if (protocolo.status === "INEXISTENTE") {
            throw new Error("NFCE_NAO_ENCONTRADA");
        }
        if (protocolo.status === "CANCELADA") {
            throw new Error("NFCE_CANCELADA");
        }
        if (protocolo.status === "DENEGADA") {
            throw new Error("NFCE_NAO_AUTORIZADA");
        }
        if (protocolo.status !== "AUTORIZADA") {
            if (protocolo.cStat === "656" || protocolo.cStat === "108" || protocolo.cStat === "109") {
                throw new Error("SEFAZ_INDISPONIVEL");
            }
            throw new Error("NFCE_NAO_AUTORIZADA");
        }

        const complementar = await this.fonteComplementar.obterPorChave(chaveValidada.chave);

        const ambiente: AmbienteNfce =
            this.opcoes.ambiente === "producao" ? "PRODUCAO" : "HOMOLOGACAO";

        // Valor do QR offline NÃO é usado para crédito — só XML/fonte complementar.
        return {
            chaveAcesso: chaveValidada.chave,
            cnpjEmitente: formatarCnpj(
                complementar?.cnpjEmitenteDigitos ?? chaveValidada.cnpjEmitenteDigitos,
            ),
            valorTotal: complementar?.valorTotal ?? null,
            dataEmissao: complementar?.dataEmissao ?? null,
            status: "AUTORIZADA",
            uf: chaveValidada.uf,
            modelo: 65,
            ambiente,
            provider: "sefaz",
            protocoloAutorizacao: protocolo.protocoloAutorizacao,
            cStat: protocolo.cStat,
        };
    }
}

export function ambienteSefazDeEnv(raw: string | undefined): AmbienteSefaz {
    return raw === "producao" ? "producao" : "homologacao";
}

export function ambienteNfceLabel(ambiente: AmbienteSefaz): AmbienteNfce {
    return ambiente === "producao" ? "PRODUCAO" : "HOMOLOGACAO";
}

export { tpAmbDeAmbiente };
