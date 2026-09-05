import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { ControladorNfce } from "../controller/ControladorNfce";
import { criarControladorNfce } from "../factory/criarControladorNfce";

export function RotasNfce(controller: ControladorNfce = criarControladorNfce()) {
    const router = Router();

    router.use(garantirAutenticado);
    router.use(garantirPapel(Role.CONSUMIDOR));

    router.post("/processar", tratarAsync(controller.processar.bind(controller)));

    return router;
}
