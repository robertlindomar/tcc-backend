import { Router } from "express";
import { garantirAutenticado } from "../../shared/middlewares/garantirAutenticado";
import { tratarAsync } from "../../shared/utils/tratarAsync";
import { criarControladorUsuario } from "./factory/criarControladorUsuario";

export function RotasUsuario() {
    const router = Router();
    const controller = criarControladorUsuario();

    // POST permanece público (compatibilidade Postman Fase 0 / cadastro direto)
    router.post("/", tratarAsync(controller.criar.bind(controller)));

    router.get("/", garantirAutenticado, tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", garantirAutenticado, tratarAsync(controller.buscar.bind(controller)));
    router.put("/:id", garantirAutenticado, tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", garantirAutenticado, tratarAsync(controller.deletar.bind(controller)));

    return router;
}
