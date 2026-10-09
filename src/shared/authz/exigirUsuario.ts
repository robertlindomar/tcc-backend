import { Request } from "express";
import { Role } from "../../modules/auth/enum/Role";
import { ErroAplicacao } from "../erros/ErroAplicacao";

export function exigirUsuario(request: Request): { id: number; role: Role } {
    if (!request.usuario) {
        throw new ErroAplicacao("Usuario nao autenticado", 401);
    }
    return request.usuario;
}
