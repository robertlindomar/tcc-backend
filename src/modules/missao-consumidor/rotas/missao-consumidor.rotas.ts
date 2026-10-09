import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { ControladorMissaoConsumidor } from "../controller/ControladorMissaoConsumidor";
import { criarControladorMissaoConsumidor } from "../factory/criarControladorMissaoConsumidor";

export function RotasMissaoConsumidor(
    controller: ControladorMissaoConsumidor = criarControladorMissaoConsumidor(),
) {
    const router = Router();

    router.use(garantirAutenticado);
    router.use(garantirPapel(Role.CONSUMIDOR));

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.post("/concluir", tratarAsync(controller.concluirPorToken.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));

    return router;
}
