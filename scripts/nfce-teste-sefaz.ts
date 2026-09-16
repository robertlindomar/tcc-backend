#!/usr/bin/env tsx
/**
 * Consulta SEFAZ somente leitura — NÃO executado no CI.
 *
 * Uso:
 *   npm run nfce:teste:sefaz -- --chave=35260838281946000146650010000042331599885707
 *   npm run nfce:teste:sefaz -- --qr="https://www.nfce.fazenda.sp.gov.br/qrcode?p=..."
 *
 * Requer:
 *   SEFAZ_CERT_PFX_PATH, SEFAZ_CERT_PASSPHRASE (opcional),
 *   SEFAZ_AMBIENTE=producao|homologacao
 *
 * Não grava tickets. Não imprime XML completo nem dados de consumidor.
 */

import "dotenv/config";
import { parsearQrCodeNfce } from "../src/modules/nfce/utils/parsearQrCodeNfce";
import { consultarProtocoloNfceSp } from "../src/modules/nfce/sefaz/consultaProtocoloSp";
import { ambienteSefazDeEnv } from "../src/modules/nfce/adaptador/AdaptadorNfceSefaz";
import { criarFonteComplementarNfce } from "../src/modules/nfce/factory/criarAdaptadorNfce";

function arg(nome: string): string | undefined {
    const pref = `--${nome}=`;
    const hit = process.argv.find((a) => a.startsWith(pref));
    return hit ? hit.slice(pref.length) : undefined;
}

async function main(): Promise<void> {
    const qr = arg("qr");
    const chaveArg = arg("chave");
    if (!qr && !chaveArg) {
        console.error("Informe --qr=... ou --chave=44digitos");
        process.exit(2);
    }

    const ambiente = ambienteSefazDeEnv(process.env.SEFAZ_AMBIENTE);
    const parseado = parsearQrCodeNfce(qr ?? chaveArg!);
    const chave = parseado.chaveValidada.chave;
    const chaveMascarada = `${chave.slice(0, 6)}…${chave.slice(-4)}`;

    console.log(`Provider: sefaz`);
    console.log(`Ambiente: ${ambiente}`);
    console.log(`UF: ${parseado.chaveValidada.uf}`);
    console.log(`modelo: ${parseado.chaveValidada.modelo}`);
    console.log(`chave: ${chaveMascarada}`);

    if (!process.env.SEFAZ_CERT_PFX_PATH) {
        console.error("SEFAZ: FALHA — SEFAZ_CERT_PFX_PATH não configurado");
        console.error(
            "Sem certificado não há ConsultaProtocolo. valorTotal exige XML do lojista (NFCE_XML_DIR).",
        );
        process.exit(1);
    }

    const inicio = Date.now();
    try {
        const protocolo = await consultarProtocoloNfceSp(chave, {
            ambiente,
            pfxPath: process.env.SEFAZ_CERT_PFX_PATH,
            passphrase: process.env.SEFAZ_CERT_PASSPHRASE,
        });
        const ms = Date.now() - inicio;
        console.log(`SEFAZ: OK (${ms}ms)`);
        console.log(`status: ${protocolo.status}`);
        console.log(`cStat: ${protocolo.cStat}`);
        if (protocolo.protocoloAutorizacao) {
            console.log(`protocolo: ${protocolo.protocoloAutorizacao.slice(0, 4)}…`);
        }

        const fonte = criarFonteComplementarNfce();
        const extra = await fonte.obterPorChave(chave);
        if (extra) {
            console.log(`CNPJ: ${extra.cnpjEmitenteDigitos ?? parseado.chaveValidada.cnpjEmitenteDigitos}`);
            console.log(`valor: ${extra.valorTotal.toFixed(2)}`);
            console.log(`emissao: ${extra.dataEmissao.toISOString()}`);
        } else {
            console.log(
                `CNPJ (chave): ${parseado.chaveValidada.cnpjEmitenteDigitos}`,
            );
            console.log(
                "valor: (indisponível — ConsultaProtocolo não retorna vNF; use NFCE_XML_DIR)",
            );
            console.log("emissao: (indisponível sem XML)");
        }
    } catch (erro) {
        const codigo = erro instanceof Error ? erro.message : "ERRO";
        console.error(`SEFAZ: FALHA — ${codigo}`);
        process.exit(1);
    }
}

main();
