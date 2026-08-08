import { Router } from "express";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorSexo } from "../factory/criarControladorSexo";

export function RotasSexo() {
    const router = Router();
    const controller = criarControladorSexo();

    router.use(garantirAutenticado);

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post("/", tratarAsync(controller.criar.bind(controller)));
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
