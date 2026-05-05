import prismaClient from "../../../prisma";
import { UsuarioController } from "../controller/UsuarioController";
import { UsuarioRepository } from "../repository/UsuarioRepository";
import { UsuarioService } from "../service/UsuarioService";

export function makeUsuarioController(): UsuarioController {
    const repository = new UsuarioRepository(prismaClient);
    const service = new UsuarioService(repository);
    return new UsuarioController(service);
}
