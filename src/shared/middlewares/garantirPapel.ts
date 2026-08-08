import { NextFunction, Request, Response } from "express";
import { Role } from "../../modules/auth/enum/Role";
import { ErroAplicacao } from "../erros/ErroAplicacao";

export function garantirPapel(...roles: Role[]) {
    return (request: Request, _response: Response, next: NextFunction): void => {
        if (!request.usuario) {
            next(new ErroAplicacao("Usuario nao autenticado", 401));
            return;
        }

        if (!roles.includes(request.usuario.role)) {
            next(new ErroAplicacao("Acesso nao autorizado para este perfil", 403));
            return;
        }

        next();
    };
}
