import { describe, expect, it } from "vitest";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { garantirProprioId } from "./garantirProprioId";

describe("garantirProprioId", () => {
    it("permite quando o id do recurso e o autenticado coincidem", () => {
        expect(() => garantirProprioId(10, 10)).not.toThrow();
    });

    it("nega acesso cruzado com 403", () => {
        expect(() => garantirProprioId(11, 10)).toThrow(ErroAplicacao);
        try {
            garantirProprioId(11, 10);
        } catch (erro) {
            expect(erro).toMatchObject({
                message: "Acesso nao autorizado a este recurso",
                statusCode: 403,
            });
        }
    });
});
