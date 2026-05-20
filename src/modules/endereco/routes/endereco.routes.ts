import { Router } from "express";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { makeEnderecoController } from "../factory/makeEnderecoController";

export function EnderecoRoutes() {
    const router = Router();
    const controller = makeEnderecoController();

    router.post("/", tratarAsync(controller.criar.bind(controller)));
    router.get(
        "/usuario/:usuarioId",
        tratarAsync(controller.buscarPorUsuario.bind(controller)),
    );
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
