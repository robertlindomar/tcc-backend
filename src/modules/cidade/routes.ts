import { Router } from "express";
import { tratarAsync } from "../../shared/utils/tratarAsync";
import { makeCidadeController } from "./factory/makeCidadeController";

export function CidadeRoutes() {
    const router = Router();
    const controller = makeCidadeController();

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post("/", tratarAsync(controller.criar.bind(controller)));
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
