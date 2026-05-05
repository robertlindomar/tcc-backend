import prismaClient from "../../../prisma";
import { RuaController } from "../controller/RuaController";
import { RuaRepository } from "../repository/RuaRepository";
import { RuaService } from "../service/RuaService";

export function makeRuaController(): RuaController {
    const repository = new RuaRepository(prismaClient);
    const service = new RuaService(repository);
    return new RuaController(service);
}
