import { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../modules/auth/enum/Role";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { garantirPapel } from "./garantirPapel";

describe("garantirPapel", () => {
    let response: Response;
    let next: NextFunction;

    beforeEach(() => {
        response = {} as Response;
        next = vi.fn();
    });

    it("permite acesso quando o papel esta autorizado", () => {
        const request = {
            usuario: { id: 1, role: Role.ASSOCIACAO },
        } as Request;
        const middleware = garantirPapel(Role.ASSOCIACAO, Role.LOJISTA);

        middleware(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });

    it("nega acesso com 403 quando o papel nao esta autorizado", () => {
        const request = {
            usuario: { id: 2, role: Role.CONSUMIDOR },
        } as Request;
        const middleware = garantirPapel(Role.ASSOCIACAO);

        middleware(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        const erro = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(erro).toBeInstanceOf(ErroAplicacao);
        expect(erro.statusCode).toBe(403);
        expect(erro.message).toBe("Acesso nao autorizado para este perfil");
    });
});
