import {
    AdaptadorNfce,
} from "../adaptador/AdaptadorNfce";
import { AdaptadorNfceSimulado } from "../adaptador/AdaptadorNfceSimulado";
import {
    AdaptadorNfceSefaz,
    ambienteSefazDeEnv,
} from "../adaptador/AdaptadorNfceSefaz";
import {
    FonteDadosComplementaresNfce,
    FonteDadosComplementaresVazia,
    FonteXmlDiretorioLocal,
} from "../sefaz/fonteDadosComplementaresNfce";

export type ProviderNfceConfig = "simulado" | "sefaz";

export function resolverProviderNfce(
    raw: string | undefined = process.env.NFCE_PROVIDER,
): ProviderNfceConfig {
    return raw === "sefaz" ? "sefaz" : "simulado";
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
