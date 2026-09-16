import { describe, expect, it, vi } from "vitest";
import { RepositorioLojista } from "./RepositorioLojista";

describe("buscarPorCnpjNormalizado", () => {
    it.each(["22.399.004/0006-31", "22399004000631"])("normaliza %s e parametriza consulta", async (cnpj) => {
        const consultar = vi.fn().mockResolvedValue([{ id: 2 }]);
        const repositorio = new RepositorioLojista({ $queryRaw: consultar } as never);
        const buscar = vi.spyOn(repositorio, "buscar").mockResolvedValue(null);
        await repositorio.buscarPorCnpjNormalizado(cnpj);
        const [sql, parametro] = consultar.mock.calls[0]!;
        expect(sql.join("?")).toContain("regexp_replace(cnpj_lojista, '[^0-9]', '', 'g') = ?");
        expect(parametro).toBe("22399004000631");
        expect(buscar).toHaveBeenCalledWith(2);
    });
    it("não escolhe arbitrariamente entre cadastros duplicados com máscaras diferentes", async () => {
        const repositorio = new RepositorioLojista({
            $queryRaw: vi.fn().mockResolvedValue([{ id: 2 }, { id: 3 }]),
        } as never);
        await expect(repositorio.buscarPorCnpjNormalizado("22399004000631"))
            .rejects.toMatchObject({ statusCode: 409 });
    });
});
