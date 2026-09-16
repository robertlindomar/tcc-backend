import { AdaptadorNfce, NfceConsultada } from "./AdaptadorNfce";
import { buscarFixtureNfcePorChave } from "./fixturesNfceDemo";
import { extrairChaveAcessoNfce } from "../utils/extrairChaveAcessoNfce";
import { validarChaveAcessoNfce } from "../utils/validarChaveAcessoNfce";
import { formatarCnpj } from "../utils/extrairChaveAcessoNfce";

/**
 * Adaptador DEMO rotulado — NÃO consulta SEFAZ.
 *
 * Aceita apenas chaves presentes em FIXTURES_NFCE_DEMO:
 * - URL real-like com chave em `p=` / 44 dígitos
 * - URI `tcc://nfce-demo?chave=...` (só se a chave estiver na allowlist; usa dados da fixture)
 * - chave crua de 44 dígitos
 */
export class AdaptadorNfceSimulado implements AdaptadorNfce {
    async consultar(payloadQr: string): Promise<NfceConsultada> {
        return this.ler(payloadQr);
    }

    /** Compatível com chamadas antigas `ler`. */
    async ler(payloadQr: string): Promise<NfceConsultada> {
        const texto = payloadQr.trim();
        if (!texto) {
            throw new Error("PAYLOAD_NFCE_VAZIO");
        }

        if (texto.startsWith("tcc://nfce-demo")) {
            return this.lerUriDemo(texto);
        }

        const chave = extrairChaveAcessoNfce(texto);
        const chaveValidada = validarChaveAcessoNfce(chave);
        const fixture = buscarFixtureNfcePorChave(chaveValidada.chave);
        if (!fixture) {
            throw new Error("NFCE_DEMO_NAO_ENCONTRADA");
        }
        return this.paraConsultada(fixture);
    }

    private lerUriDemo(uri: string): NfceConsultada {
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

        const chaveValidada = validarChaveAcessoNfce(chave);
        const fixture = buscarFixtureNfcePorChave(chaveValidada.chave);
        if (!fixture) {
            throw new Error("NFCE_DEMO_NAO_ENCONTRADA");
        }
        return this.paraConsultada(fixture);
    }

    private paraConsultada(fixture: {
        chaveAcesso: string;
        cnpjEmitente: string;
        valorTotal: number;
        dataEmissao: Date;
    }): NfceConsultada {
        const chaveValidada = validarChaveAcessoNfce(fixture.chaveAcesso);
        return {
            chaveAcesso: fixture.chaveAcesso,
            cnpjEmitente: fixture.cnpjEmitente.includes("/")
                ? fixture.cnpjEmitente
                : formatarCnpj(fixture.cnpjEmitente),
            valorTotal: fixture.valorTotal,
            dataEmissao: fixture.dataEmissao,
            status: "AUTORIZADA",
            uf: chaveValidada.uf,
            modelo: 65,
            ambiente: "DEMO",
            provider: "simulado",
        };
    }
}
