import prismaClient from "../../../prisma";
import { BairroController } from "../controller/BairroController";
import { BairroRepository } from "../repository/BairroRepository";
import { BairroService } from "../service/BairroService";

export function makeBairroController(): BairroController {
    const repository = new BairroRepository(prismaClient);
    const service = new BairroService(repository);
    return new BairroController(service);
}
