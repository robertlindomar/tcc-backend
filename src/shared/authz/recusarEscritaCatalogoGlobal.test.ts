import { describe, expect, it } from "vitest";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { recusarEscritaCatalogoGlobal } from "./recusarEscritaCatalogoGlobal";

describe("recusarEscritaCatalogoGlobal", () => {
    it("bloqueia escrita com 403", () => {
        expect(() => recusarEscritaCatalogoGlobal()).toThrow(ErroAplicacao);
        try {
            recusarEscritaCatalogoGlobal();
        } catch (erro) {
            expect(erro).toMatchObject({
                message: "Escrita de catalogo global nao permitida",
                statusCode: 403,
            });
        }
    });
});
