import { describe, expect, it, vi } from "vitest";
import { AdaptadorNfceSefaz } from "./AdaptadorNfceSefaz";
import type { FonteDadosComplementaresNfce } from "../sefaz/fonteDadosComplementaresNfce";

const CHAVE = "35260838281946000146650010000042331599885707";

describe("AdaptadorNfceSefaz", () => {
    it("autorizada + XML complementar → valor e data oficiais", async () => {
        const fonte: FonteDadosComplementaresNfce = {
            obterPorChave: vi.fn().mockResolvedValue({
                valorTotal: 669.86,
                dataEmissao: new Date("2026-08-15T14:22:03.000Z"),
                cnpjEmitenteDigitos: "38281946000146",
            }),
        };
        const consultarProtocolo = vi.fn().mockResolvedValue({
            cStat: "100",
            xMotivo: "Autorizado o uso da NF-e",
            chNFe: CHAVE,
            status: "AUTORIZADA",
            protocoloAutorizacao: "135260000000001",
        });

        const adaptador = new AdaptadorNfceSefaz({
            ambiente: "producao",
            fonteComplementar: fonte,
            consultarProtocolo,
        });

        const r = await adaptador.consultar(CHAVE);
        expect(r.provider).toBe("sefaz");
        expect(r.status).toBe("AUTORIZADA");
        expect(r.valorTotal).toBe(669.86);
        expect(r.dataEmissao?.toISOString()).toBe("2026-08-15T14:22:03.000Z");
        expect(r.cnpjEmitente).toBe("38.281.946/0001-46");
        expect(consultarProtocolo).toHaveBeenCalled();
    });

    it("autorizada sem XML → valorTotal null (não inventa)", async () => {
        const adaptador = new AdaptadorNfceSefaz({
            ambiente: "producao",
            fonteComplementar: { obterPorChave: async () => null },
            consultarProtocolo: async () => ({
                cStat: "100",
                xMotivo: "ok",
                chNFe: CHAVE,
                status: "AUTORIZADA",
            }),
        });
        const r = await adaptador.consultar(CHAVE);
        expect(r.valorTotal).toBeNull();
        expect(r.dataEmissao).toBeNull();
    });

    it("cancelada → NFCE_CANCELADA", async () => {
        const adaptador = new AdaptadorNfceSefaz({
            ambiente: "producao",
            consultarProtocolo: async () => ({
                cStat: "101",
                xMotivo: "Cancelamento homologado",
                chNFe: CHAVE,
                status: "CANCELADA",
            }),
        });
        await expect(adaptador.consultar(CHAVE)).rejects.toThrow("NFCE_CANCELADA");
    });

    it("inexistente → NFCE_NAO_ENCONTRADA", async () => {
        const adaptador = new AdaptadorNfceSefaz({
            ambiente: "producao",
            consultarProtocolo: async () => ({
                cStat: "217",
                xMotivo: "NF-e inexistente",
                chNFe: CHAVE,
                status: "INEXISTENTE",
            }),
        });
        await expect(adaptador.consultar(CHAVE)).rejects.toThrow("NFCE_NAO_ENCONTRADA");
    });

    it("host QR fora da allowlist → SEFAZ_HOST_NAO_PERMITIDO", async () => {
        const adaptador = new AdaptadorNfceSefaz({
            ambiente: "producao",
            consultarProtocolo: async () => {
                throw new Error("nao deveria chamar");
            },
        });
        await expect(
            adaptador.consultar(`https://evil.example/?p=${CHAVE}|2|1|1|H`),
        ).rejects.toThrow("SEFAZ_HOST_NAO_PERMITIDO");
    });
});
