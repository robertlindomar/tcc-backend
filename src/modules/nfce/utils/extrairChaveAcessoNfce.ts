/**
 * Extrai a chave de acesso NFC-e (44 dígitos) de URL de consulta, parâmetro `p=`,
 * ou string contendo a chave.
 */
export function extrairChaveAcessoNfce(entrada: string): string {
    const texto = entrada.trim();
    if (!texto) {
        throw new Error("PAYLOAD_NFCE_VAZIO");
    }

    const soDigitos = texto.replace(/\D/g, "");
    if (soDigitos.length === 44) {
        return soDigitos;
    }

    try {
        const url = new URL(texto);
        const p = url.searchParams.get("p") ?? url.searchParams.get("chNFe");
        if (p) {
            const primeiroCampo = p.split("|")[0]?.replace(/\D/g, "") ?? "";
            if (primeiroCampo.length === 44) {
                return primeiroCampo;
            }
        }
        for (const valor of url.searchParams.values()) {
            const digitos = valor.replace(/\D/g, "");
            if (digitos.length === 44) {
                return digitos;
            }
            const campo = valor.split("|")[0]?.replace(/\D/g, "") ?? "";
            if (campo.length === 44) {
                return campo;
            }
        }
    } catch {
        // não é URL absoluta — tenta achar 44 dígitos no texto
    }

    const match = texto.match(/\d{44}/);
    if (match) {
        return match[0];
    }

    throw new Error("CHAVE_NFCE_NAO_ENCONTRADA");
}

/** CNPJ (14 dígitos) embutido na chave de acesso (posições 7–20, 1-based). */
export function extrairCnpjDaChaveAcesso(chaveAcesso: string): string {
    const chave = chaveAcesso.replace(/\D/g, "");
    if (chave.length !== 44) {
        throw new Error("CHAVE_NFCE_INVALIDA");
    }
    return chave.slice(6, 20);
}

export function formatarCnpj(digitos: string): string {
    const d = digitos.replace(/\D/g, "");
    if (d.length !== 14) {
        throw new Error("CNPJ_INVALIDO");
    }
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
