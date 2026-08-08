import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../modules/auth/enum/Role";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { garantirAutenticado } from "./garantirAutenticado";

const SECRET_TESTE = "segredo-teste-vitest";

function criarRequest(authorization?: string): Request {
    return {
        headers: authorization ? { authorization } : {},
    } as Request;
}

describe("garantirAutenticado", () => {
    let response: Response;
    let next: NextFunction;

    beforeEach(() => {
        process.env.SECRET_KEY = SECRET_TESTE;
        response = {} as Response;
        next = vi.fn();
    });

    it("sem header Authorization chama next com ErroAplicacao 401", () => {
        const request = criarRequest();

        garantirAutenticado(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        const erro = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(erro).toBeInstanceOf(ErroAplicacao);
        expect(erro.statusCode).toBe(401);
        expect(erro.message).toBe("Token nao informado");
    });

    it("Bearer invalido chama next com ErroAplicacao 401", () => {
        const request = criarRequest("Bearer token-invalido");

        garantirAutenticado(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        const erro = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(erro).toBeInstanceOf(ErroAplicacao);
        expect(erro.statusCode).toBe(401);
        expect(erro.message).toBe("Token invalido ou expirado");
    });

    it("token valido preenche request.usuario e chama next sem erro", () => {
        const token = jwt.sign(
            { sub: 42, role: Role.LOJISTA },
            SECRET_TESTE,
            { expiresIn: "1h" },
        );
        const request = criarRequest(`Bearer ${token}`);

        garantirAutenticado(request, response, next);

        expect(request.usuario).toEqual({ id: 42, role: Role.LOJISTA });
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });
});
