import { describe, expect, it } from "vitest";
import { AdaptadorNfceSimulado } from "./AdaptadorNfceSimulado";
import { FIXTURES_NFCE_DEMO } from "./fixturesNfceDemo";

describe("AdaptadorNfceSimulado", () => {
    const adaptador = new AdaptadorNfceSimulado();

    it("resolve fixture por URL com p= (modoSimulado)", async () => {
        const chave = FIXTURES_NFCE_DEMO[0].chaveAcesso;
        const url = `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${chave}|2|1|1|HASH`;
        const dados = await adaptador.ler(url);
        expect(dados.modoSimulado).toBe(true);
        expect(dados.chaveAcesso).toBe(chave);
        expect(dados.valorTotal).toBe(55);
        expect(dados.cnpjEmitente).toBe("44.444.444/0001-44");
    });

    it("resolve URI tcc://nfce-demo explicita", async () => {
        const chave = "35260944444444000144650010000000091123456789";
        const uri =
            `tcc://nfce-demo?chave=${chave}&cnpj=44444444000144&valor=12.34&data=2026-09-04`;
        const dados = await adaptador.ler(uri);
        expect(dados).toMatchObject({
            modoSimulado: true,
            chaveAcesso: chave,
            cnpjEmitente: "44.444.444/0001-44",
            valorTotal: 12.34,
        });
        expect(dados.dataEmissao.toISOString().startsWith("2026-09-04")).toBe(true);
    });

    it("falha se chave nao esta nas fixtures", async () => {
        await expect(
            adaptador.ler("35260911111111000111650010000000011123456780"),
        ).rejects.toThrow("NFCE_DEMO_NAO_ENCONTRADA");
    });
});
