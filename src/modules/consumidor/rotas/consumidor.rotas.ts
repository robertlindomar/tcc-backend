import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorConsumidor } from "../factory/criarControladorConsumidor";

export function RotasConsumidor() {
    const router = Router();
    const controller = criarControladorConsumidor();

    router.use(garantirAutenticado);

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post(
        "/",
        garantirPapel(Role.CONSUMIDOR),
        tratarAsync(controller.criar.bind(controller)),
    );
    router.put(
        "/:id",
        garantirPapel(Role.CONSUMIDOR),
        tratarAsync(controller.atualizar.bind(controller)),
    );
    router.delete(
        "/:id",
        garantirPapel(Role.CONSUMIDOR),
        tratarAsync(controller.deletar.bind(controller)),
    );

    return router;
}
