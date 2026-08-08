import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorAssociacao } from "../factory/criarControladorAssociacao";

export function RotasAssociacao() {
    const router = Router();
    const controller = criarControladorAssociacao();

    router.use(garantirAutenticado);

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post(
        "/",
        garantirPapel(Role.ASSOCIACAO),
        tratarAsync(controller.criar.bind(controller)),
    );
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
