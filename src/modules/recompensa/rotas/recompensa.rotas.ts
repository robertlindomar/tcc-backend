import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorRecompensa } from "../factory/criarControladorRecompensa";

export function RotasRecompensa() {
    const router = Router();
    const controller = criarControladorRecompensa();

    router.use(garantirAutenticado);

    router.get(
        "/catalogo",
        garantirPapel(Role.CONSUMIDOR),
        tratarAsync(controller.catalogo.bind(controller)),
    );
    router.post(
        "/:id/resgatar",
        garantirPapel(Role.CONSUMIDOR),
        tratarAsync(controller.resgatar.bind(controller)),
    );
    router.patch(
        "/:id/desativar",
        garantirPapel(Role.LOJISTA),
        tratarAsync(controller.desativar.bind(controller)),
    );

    router.get("/", garantirPapel(Role.LOJISTA), tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", garantirPapel(Role.LOJISTA), tratarAsync(controller.buscar.bind(controller)));
    router.post("/", garantirPapel(Role.LOJISTA), tratarAsync(controller.criar.bind(controller)));
    router.put("/:id", garantirPapel(Role.LOJISTA), tratarAsync(controller.atualizar.bind(controller)));
    router.delete(
        "/:id",
        garantirPapel(Role.LOJISTA),
        tratarAsync(controller.deletar.bind(controller)),
    );

    return router;
}

export function RotasResgateRecompensa() {
    const router = Router();
    const controller = criarControladorRecompensa();

    router.use(garantirAutenticado);

    router.get(
        "/loja",
        garantirPapel(Role.LOJISTA),
        tratarAsync(controller.listarResgatesLoja.bind(controller)),
    );
    router.patch(
        "/:id/confirmar-entrega",
        garantirPapel(Role.LOJISTA),
        tratarAsync(controller.confirmarEntrega.bind(controller)),
    );
    router.get(
        "/",
        garantirPapel(Role.CONSUMIDOR),
        tratarAsync(controller.listarResgates.bind(controller)),
    );

    return router;
}
