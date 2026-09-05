import {
    AdaptadorLeituraNfce,
    DadosNfceLida,
} from "./AdaptadorLeituraNfce";
import { buscarFixtureNfcePorChave } from "./fixturesNfceDemo";
import {
    extrairChaveAcessoNfce,
    extrairCnpjDaChaveAcesso,
    formatarCnpj,
} from "../utils/extrairChaveAcessoNfce";

/**
 * Adaptador DEMO rotulado — NÃO consulta SEFAZ.
 *
 * Aceita:
 * - URL real-like com chave em `p=` / 44 dígitos (resolve via fixture)
 * - URI explícita `tcc://nfce-demo?chave=&cnpj=&valor=&data=` (YYYY-MM-DD)
 * - chave crua de 44 dígitos presente nas fixtures
 */
export class AdaptadorNfceSimulado implements AdaptadorLeituraNfce {
    async ler(payloadQr: string): Promise<DadosNfceLida> {
        const texto = payloadQr.trim();
        if (!texto) {
            throw new Error("PAYLOAD_NFCE_VAZIO");
        }

        if (texto.startsWith("tcc://nfce-demo")) {
            return this.lerUriDemo(texto);
        }

        const chave = extrairChaveAcessoNfce(texto);
        const fixture = buscarFixtureNfcePorChave(chave);
        if (!fixture) {
            throw new Error("NFCE_DEMO_NAO_ENCONTRADA");
        }
        return fixture;
    }

    private lerUriDemo(uri: string): DadosNfceLida {
        let url: URL;
        try {
            url = new URL(uri);
        } catch {
            throw new Error("URI_NFCE_DEMO_INVALIDA");
        }

        const chave = (url.searchParams.get("chave") ?? "").replace(/\D/g, "");
        if (chave.length !== 44) {
            throw new Error("CHAVE_NFCE_INVALIDA");
        }

        const cnpjParam = url.searchParams.get("cnpj");
        const cnpjEmitente = cnpjParam
            ? formatarCnpj(cnpjParam.replace(/\D/g, ""))
            : formatarCnpj(extrairCnpjDaChaveAcesso(chave));

        const valorRaw = url.searchParams.get("valor");
        const valorTotal = valorRaw == null ? NaN : Number(valorRaw.replace(",", "."));
        if (!Number.isFinite(valorTotal) || valorTotal < 0) {
            throw new Error("VALOR_NFCE_INVALIDO");
        }

        const dataRaw = url.searchParams.get("data");
        if (!dataRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dataRaw)) {
            throw new Error("DATA_NFCE_INVALIDA");
        }
        const dataEmissao = new Date(`${dataRaw}T12:00:00.000Z`);
        if (Number.isNaN(dataEmissao.getTime())) {
            throw new Error("DATA_NFCE_INVALIDA");
        }

        return {
            chaveAcesso: chave,
            cnpjEmitente,
            valorTotal,
            dataEmissao,
            modoSimulado: true,
        };
    }
}
