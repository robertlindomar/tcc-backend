import prismaClient from "../../../prisma";
import { CidadeController } from "../controller/CidadeController";
import { CidadeRepository } from "../repository/CidadeRepository";
import { CidadeService } from "../service/CidadeService";

export function makeCidadeController(): CidadeController {
    const repository = new CidadeRepository(prismaClient);
    const service = new CidadeService(repository);
    return new CidadeController(service);
}
