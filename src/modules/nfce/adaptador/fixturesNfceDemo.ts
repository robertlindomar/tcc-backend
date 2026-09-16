import { DadosNfceLida } from "../adaptador/AdaptadorLeituraNfce";

/**
 * Fixtures rotuladas de DEMO (não são consulta SEFAZ).
 * CNPJ 38.281.946/0001-46 = BÁSICO BRASIL (lojista1 aprovado no seed;
 * CNPJ embutido na chave — não hardcoded no provider SEFAZ).
 * Só esta chave é aceita pelo AdaptadorNfceSimulado.
 */
export const FIXTURES_NFCE_DEMO: ReadonlyArray<
    Omit<DadosNfceLida, "modoSimulado"> & { rotulo: string }
> = [
    {
        rotulo: "basico-brasil-669-86",
        chaveAcesso: "35260838281946000146650010000042331599885707",
        cnpjEmitente: "38.281.946/0001-46",
        valorTotal: 669.86,
        dataEmissao: new Date("2026-08-15T14:22:03.000Z"),
    },
];

export function buscarFixtureNfcePorChave(chaveAcesso: string): DadosNfceLida | null {
    const item = FIXTURES_NFCE_DEMO.find((f) => f.chaveAcesso === chaveAcesso);
    if (!item) {
        return null;
    }
    return {
        chaveAcesso: item.chaveAcesso,
        cnpjEmitente: item.cnpjEmitente,
        valorTotal: item.valorTotal,
        dataEmissao: item.dataEmissao,
        modoSimulado: true,
    };
}
