import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorPromocao } from "../factory/criarControladorPromocao";

export function RotasPromocao() {
    const router = Router();
    const controller = criarControladorPromocao();

    router.use(garantirAutenticado);
    router.use(garantirPapel(Role.LOJISTA));

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post("/", tratarAsync(controller.criar.bind(controller)));
    router.patch("/:id/desativar", tratarAsync(controller.desativar.bind(controller)));
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
