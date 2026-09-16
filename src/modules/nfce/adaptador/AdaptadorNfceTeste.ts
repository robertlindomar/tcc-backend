import { AdaptadorNfce, NfceConsultada } from "./AdaptadorNfce";
import { FonteDadosComplementaresNfce } from "../sefaz/fonteDadosComplementaresNfce";
import { parsearQrCodeNfce } from "../utils/parsearQrCodeNfce";
import { ConsultaPublicaQrSp } from "../sefaz/consultaPublicaQrSp";

/** TESTE / NÃO PRODUÇÃO. Consulta pública não substitui ConsultaProtocolo. */
export class AdaptadorNfceTeste implements AdaptadorNfce {
    readonly validarEmitenteAntesDaConsulta = true;

    constructor(
        private readonly fonte?: FonteDadosComplementaresNfce,
        private readonly consultaPublica = new ConsultaPublicaQrSp(),
    ) {}

    async consultar(payloadQr: string): Promise<NfceConsultada> {
        const { chaveValidada } = parsearQrCodeNfce(payloadQr);
        const dados = this.fonte
            ? await this.fonte.obterPorChave(chaveValidada.chave)
            : await this.consultaPublica.obterPorQrCode(payloadQr);
        if (!dados) throw new Error("NFCE_DADOS_COMPLEMENTARES_INDISPONIVEIS");
        if (dados.cnpjEmitenteDigitos !== chaveValidada.cnpjEmitenteDigitos) {
            throw new Error(this.fonte ? "NFCE_XML_CNPJ_DIVERGENTE" : "NFCE_CONSULTA_CNPJ_DIVERGENTE");
        }
        return {
            chaveAcesso: chaveValidada.chave,
            cnpjEmitente: chaveValidada.cnpjEmitenteDigitos,
            valorTotal: dados.valorTotal,
            dataEmissao: dados.dataEmissao,
            status: "DESCONHECIDO",
            uf: chaveValidada.uf,
            modelo: 65,
            ambiente: "TESTE",
            provider: "teste",
        };
    }
}
