import { DadosNfceLida } from "../adaptador/AdaptadorLeituraNfce";

/**
 * Fixtures rotuladas de DEMO (não são consulta SEFAZ).
 * CNPJ 44.444.444/0001-44 = Casa do Real (lojista1 aprovado no seed).
 */
export const FIXTURES_NFCE_DEMO: ReadonlyArray<
    Omit<DadosNfceLida, "modoSimulado"> & { rotulo: string }
> = [
    {
        rotulo: "demo-nota-55",
        chaveAcesso: "35260944444444000144650010000000011123456780",
        cnpjEmitente: "44.444.444/0001-44",
        valorTotal: 55,
        dataEmissao: new Date("2026-09-04T15:00:00.000Z"),
    },
    {
        rotulo: "demo-nota-5",
        chaveAcesso: "35260944444444000144650010000000021123456781",
        cnpjEmitente: "44.444.444/0001-44",
        valorTotal: 5,
        dataEmissao: new Date("2026-09-04T16:00:00.000Z"),
    },
    {
        rotulo: "demo-nota-27-50",
        chaveAcesso: "35260944444444000144650010000000031123456782",
        cnpjEmitente: "44.444.444/0001-44",
        valorTotal: 27.5,
        dataEmissao: new Date("2026-09-04T17:00:00.000Z"),
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
