import { Router } from "express";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorEndereco } from "../factory/criarControladorEndereco";

export function RotasEndereco() {
    const router = Router();
    const controller = criarControladorEndereco();

    router.use(garantirAutenticado);

    router.post("/", tratarAsync(controller.criar.bind(controller)));
    router.get(
        "/usuario/:usuarioId",
        tratarAsync(controller.buscarPorUsuario.bind(controller)),
    );
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
