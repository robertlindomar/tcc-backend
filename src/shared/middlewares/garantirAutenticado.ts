import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../../modules/auth/enum/Role";
import { ErroAplicacao } from "../erros/ErroAplicacao";

type JwtAuthPayload = {
    sub: number | string;
    role: Role;
};

export function garantirAutenticado(
    request: Request,
    _response: Response,
    next: NextFunction,
): void {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new ErroAplicacao("Token nao informado", 401);
        }

        const [scheme, token] = authHeader.split(" ");

        if (scheme !== "Bearer" || !token) {
            throw new ErroAplicacao("Formato de token invalido. Use: Bearer <token>", 401);
        }

        const secret = process.env.SECRET_KEY;
        if (!secret) {
            throw new ErroAplicacao("SECRET_KEY nao configurada", 500);
        }

        const decoded = jwt.verify(token, secret) as JwtAuthPayload;
        const id = typeof decoded.sub === "string" ? Number(decoded.sub) : decoded.sub;

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("Token invalido", 401);
        }

        if (!Object.values(Role).includes(decoded.role)) {
            throw new ErroAplicacao("Token invalido", 401);
        }

        request.usuario = { id, role: decoded.role };
        next();
    } catch (error) {
        if (error instanceof ErroAplicacao) {
            next(error);
            return;
        }
        next(new ErroAplicacao("Token invalido ou expirado", 401));
    }
}
