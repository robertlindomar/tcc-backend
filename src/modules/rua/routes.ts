import { Router } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { makeRuaController } from "./factory/makeRuaController";

export function RuaRoutes() {
    const router = Router();
    const controller = makeRuaController();

    router.get("/", asyncHandler(controller.listar.bind(controller)));
    router.get("/:id", asyncHandler(controller.buscar.bind(controller)));
    router.post("/", asyncHandler(controller.criar.bind(controller)));
    router.put("/:id", asyncHandler(controller.atualizar.bind(controller)));
    router.delete("/:id", asyncHandler(controller.deletar.bind(controller)));

    return router;
}
