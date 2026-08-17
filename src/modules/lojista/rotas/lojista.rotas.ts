import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorLojista } from "../factory/criarControladorLojista";

export function RotasLojista() {
    const router = Router();
    const controller = criarControladorLojista();

    router.use(garantirAutenticado);

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post(
        "/",
        garantirPapel(Role.LOJISTA),
        tratarAsync(controller.criar.bind(controller)),
    );
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.patch(
        "/:id/aprovar",
        garantirPapel(Role.ASSOCIACAO),
        tratarAsync(controller.aprovar.bind(controller)),
    );
    router.patch(
        "/:id/rejeitar",
        garantirPapel(Role.ASSOCIACAO),
        tratarAsync(controller.rejeitar.bind(controller)),
    );
    router.patch(
        "/:id/reenviar",
        garantirPapel(Role.LOJISTA),
        tratarAsync(controller.reenviarParaAnalise.bind(controller)),
    );
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
