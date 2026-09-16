import {
    AdaptadorNfce,
} from "../adaptador/AdaptadorNfce";
import { AdaptadorNfceSimulado } from "../adaptador/AdaptadorNfceSimulado";
import { AdaptadorNfceTeste } from "../adaptador/AdaptadorNfceTeste";
import {
    AdaptadorNfceSefaz,
    ambienteSefazDeEnv,
} from "../adaptador/AdaptadorNfceSefaz";
import {
    FonteDadosComplementaresNfce,
    FonteDadosComplementaresVazia,
    FonteXmlDiretorioLocal,
} from "../sefaz/fonteDadosComplementaresNfce";

export type ProviderNfceConfig = "simulado" | "sefaz" | "teste";

export function resolverProviderNfce(
    raw: string | undefined = process.env.NFCE_PROVIDER,
): ProviderNfceConfig {
    return raw === "teste" ? "teste" : raw === "sefaz" ? "sefaz" : "simulado";
}

export function criarFonteComplementarNfce(): FonteDadosComplementaresNfce {
    const dir = process.env.NFCE_XML_DIR?.trim();
    if (dir) {
        return new FonteXmlDiretorioLocal(dir);
    }
    return new FonteDadosComplementaresVazia();
}

export function criarAdaptadorNfce(
    provider: ProviderNfceConfig = resolverProviderNfce(),
): AdaptadorNfce {
    if (provider === "teste") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("NFCE_PROVIDER_TESTE_PROIBIDO_EM_PRODUCAO");
        }
        const fonte = process.env.NFCE_TESTE_FONTE?.trim() || "consulta-publica";
        if (fonte === "consulta-publica") return new AdaptadorNfceTeste();
        if (fonte !== "xml") throw new Error("NFCE_TESTE_FONTE_INVALIDA");
        const dir = process.env.NFCE_XML_DIR?.trim();
        return new AdaptadorNfceTeste(dir
            ? new FonteXmlDiretorioLocal(dir, true)
            : new FonteDadosComplementaresVazia());
    }
    if (provider === "sefaz") {
        return new AdaptadorNfceSefaz({
            ambiente: ambienteSefazDeEnv(process.env.SEFAZ_AMBIENTE),
            pfxPath: process.env.SEFAZ_CERT_PFX_PATH,
            passphrase: process.env.SEFAZ_CERT_PASSPHRASE,
            fonteComplementar: criarFonteComplementarNfce(),
        });
    }
    return new AdaptadorNfceSimulado();
}
