import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { ControladorDashboard } from "../controller/ControladorDashboard";
import { criarControladorDashboard } from "../factory/criarControladorDashboard";

export function RotasDashboard(controller: ControladorDashboard = criarControladorDashboard()) {
    const router = Router();

    router.use(garantirAutenticado);
    router.use(garantirPapel(Role.ASSOCIACAO));

    router.get("/resumo", tratarAsync(controller.resumo.bind(controller)));

    return router;
}
