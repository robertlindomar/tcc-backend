import { describe, expect, it } from "vitest";
import { AdaptadorNfceSimulado } from "./AdaptadorNfceSimulado";
import { FIXTURES_NFCE_DEMO } from "./fixturesNfceDemo";

const CHAVE_VALIDA = FIXTURES_NFCE_DEMO[0]!.chaveAcesso;
/** Chave estruturalmente válida (DV ok) fora da allowlist demo. */
const CHAVE_FORA_ALLOWLIST = "35260944444444000144650010000000011123456788";

describe("AdaptadorNfceSimulado", () => {
    const adaptador = new AdaptadorNfceSimulado();

    it("resolve fixture BÁSICO BRASIL por URL com p= (provider simulado)", async () => {
        const url = `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${CHAVE_VALIDA}|2|1|1|HASH`;
        const dados = await adaptador.consultar(url);
        expect(dados.provider).toBe("simulado");
        expect(dados.status).toBe("AUTORIZADA");
        expect(dados.chaveAcesso).toBe(CHAVE_VALIDA);
        expect(dados.valorTotal).toBe(669.86);
        expect(dados.cnpjEmitente).toBe("38.281.946/0001-46");
        expect(dados.uf).toBe("SP");
        expect(dados.modelo).toBe(65);
    });

    it("resolve URI tcc://nfce-demo somente se chave estiver na allowlist", async () => {
        const uri = `tcc://nfce-demo?chave=${CHAVE_VALIDA}&valor=1&data=2026-01-01`;
        const dados = await adaptador.ler(uri);
        expect(dados).toMatchObject({
            provider: "simulado",
            chaveAcesso: CHAVE_VALIDA,
            cnpjEmitente: "38.281.946/0001-46",
            valorTotal: 669.86,
        });
    });

    it("URI tcc://nfce-demo com chave fora da allowlist falha", async () => {
        const uri = `tcc://nfce-demo?chave=${CHAVE_FORA_ALLOWLIST}&cnpj=44444444000144&valor=12.34&data=2026-09-04`;
        await expect(adaptador.ler(uri)).rejects.toThrow("NFCE_DEMO_NAO_ENCONTRADA");
    });

    it("falha se chave nao esta nas fixtures (nota antiga)", async () => {
        await expect(adaptador.consultar(CHAVE_FORA_ALLOWLIST)).rejects.toThrow(
            "NFCE_DEMO_NAO_ENCONTRADA",
        );
    });
});
