import prismaClient from "../../../prisma";
import { EstadoController } from "../controller/EstadoController";
import { EstadoRepository } from "../repository/EstadoRepository";
import { EstadoService } from "../service/EstadoService";

export function makeEstadoController(): EstadoController {
    const repository = new EstadoRepository(prismaClient);
    const service = new EstadoService(repository);
    return new EstadoController(service);
}
