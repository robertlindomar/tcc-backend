import { describe, expect, it } from "vitest";
import { ErroAplicacao } from "./ErroAplicacao";

describe("ErroAplicacao", () => {
    it("instancia com mensagem e statusCode padrao 400", () => {
        const erro = new ErroAplicacao("mensagem de erro");

        expect(erro).toBeInstanceOf(Error);
        expect(erro).toBeInstanceOf(ErroAplicacao);
        expect(erro.message).toBe("mensagem de erro");
        expect(erro.statusCode).toBe(400);
        expect(erro.name).toBe("ErroAplicacao");
    });

    it("aceita statusCode customizado", () => {
        const erro = new ErroAplicacao("nao autorizado", 401);

        expect(erro.message).toBe("nao autorizado");
        expect(erro.statusCode).toBe(401);
    });
});
