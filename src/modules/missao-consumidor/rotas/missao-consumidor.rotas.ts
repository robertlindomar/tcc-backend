import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorMissaoConsumidor } from "../factory/criarControladorMissaoConsumidor";

export function RotasMissaoConsumidor() {
    const router = Router();
    const controller = criarControladorMissaoConsumidor();

    router.use(garantirAutenticado);
    router.use(garantirPapel(Role.CONSUMIDOR));

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post("/", tratarAsync(controller.criar.bind(controller)));

    return router;
}
