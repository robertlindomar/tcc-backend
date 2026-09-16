import { extrairCnpjDaChaveAcesso } from "./extrairChaveAcessoNfce";

const PESOS_DV = [2, 3, 4, 5, 6, 7, 8, 9] as const;

const UF_POR_CODIGO: Record<string, string> = {
    "11": "RO",
    "12": "AC",
    "13": "AM",
    "14": "RR",
    "15": "PA",
    "16": "AP",
    "17": "TO",
    "21": "MA",
    "22": "PI",
    "23": "CE",
    "24": "RN",
    "25": "PB",
    "26": "PE",
    "27": "AL",
    "28": "SE",
    "29": "BA",
    "31": "MG",
    "32": "ES",
    "33": "RJ",
    "35": "SP",
    "41": "PR",
    "42": "SC",
    "43": "RS",
    "50": "MS",
    "51": "MT",
    "52": "GO",
    "53": "DF",
};

export type ChaveAcessoNfceValidada = {
    chave: string;
    codigoUf: string;
    uf: string;
    aamm: string;
    cnpjEmitenteDigitos: string;
    modelo: string;
    serie: string;
    numero: string;
    tipoEmissao: string;
    codigoNumerico: string;
    dv: string;
};

/** Dígito verificador oficial da chave de acesso (módulo 11). */
export function calcularDvChaveAcessoNfce(chave43: string): string {
    const base = chave43.replace(/\D/g, "");
    if (base.length !== 43) {
        throw new Error("CHAVE_NFCE_INVALIDA");
    }
    let soma = 0;
    let iPeso = 0;
    for (let i = base.length - 1; i >= 0; i -= 1) {
        soma += Number(base[i]) * PESOS_DV[iPeso]!;
        iPeso = (iPeso + 1) % PESOS_DV.length;
    }
    const resto = soma % 11;
    const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
    return String(dv);
}

/**
 * Valida estrutura da chave NFC-e (44 dígitos, modelo 65, UF, DV).
 * Não prova autorização fiscal — só conformidade estrutural.
 */
export function validarChaveAcessoNfce(chaveEntrada: string): ChaveAcessoNfceValidada {
    const chave = chaveEntrada.replace(/\D/g, "");
    if (chave.length !== 44) {
        throw new Error("CHAVE_NFCE_INVALIDA");
    }
    if (!/^\d{44}$/.test(chave)) {
        throw new Error("CHAVE_NFCE_INVALIDA");
    }

    const codigoUf = chave.slice(0, 2);
    const uf = UF_POR_CODIGO[codigoUf];
    if (!uf) {
        throw new Error("CHAVE_NFCE_UF_INVALIDA");
    }

    const modelo = chave.slice(20, 22);
    if (modelo !== "65") {
        throw new Error("CHAVE_NFCE_MODELO_INVALIDO");
    }

    const dvInformado = chave.slice(43, 44);
    const dvCalculado = calcularDvChaveAcessoNfce(chave.slice(0, 43));
    if (dvInformado !== dvCalculado) {
        throw new Error("CHAVE_NFCE_DV_INVALIDO");
    }

    return {
        chave,
        codigoUf,
        uf,
        aamm: chave.slice(2, 6),
        cnpjEmitenteDigitos: extrairCnpjDaChaveAcesso(chave),
        modelo,
        serie: chave.slice(22, 25),
        numero: chave.slice(25, 34),
        tipoEmissao: chave.slice(34, 35),
        codigoNumerico: chave.slice(35, 43),
        dv: dvInformado,
    };
}

export function ufDeCodigo(codigoUf: string): string | null {
    return UF_POR_CODIGO[codigoUf] ?? null;
}
