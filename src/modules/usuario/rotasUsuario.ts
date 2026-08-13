import { Router } from "express";
import { garantirAutenticado } from "../../shared/middlewares/garantirAutenticado";
import { tratarAsync } from "../../shared/utils/tratarAsync";
import { criarControladorUsuario } from "./factory/criarControladorUsuario";

export function RotasUsuario() {
    const router = Router();
    const controller = criarControladorUsuario();

    router.use(garantirAutenticado);

    router.post("/", tratarAsync(controller.criar.bind(controller)));
    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
