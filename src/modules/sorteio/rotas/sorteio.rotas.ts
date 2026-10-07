import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { ControladorSorteio } from "../controller/ControladorSorteio";
import { criarControladorSorteio } from "../factory/criarControladorSorteio";

import { ControladorAvisoSorteio } from "../avisos/ControladorAvisoSorteio";
import { criarControladorAvisoSorteio } from "../avisos/criarControladorAvisoSorteio";

export function RotasSorteio(
    controller: ControladorSorteio = criarControladorSorteio(),
    avisos: ControladorAvisoSorteio = criarControladorAvisoSorteio(),
) {
    const router = Router();

    router.use(garantirAutenticado);
    router.get("/resultados", garantirPapel(Role.CONSUMIDOR), tratarAsync(avisos.listar.bind(avisos)));
    router.patch("/resultados/:resultadoId/confirmar-leitura", garantirPapel(Role.CONSUMIDOR), tratarAsync(avisos.confirmarLeitura.bind(avisos)));
    router.patch("/resultados/:resultadoId/ocultar", garantirPapel(Role.CONSUMIDOR), tratarAsync(avisos.ocultar.bind(avisos)));

    router.use(garantirPapel(Role.ASSOCIACAO));

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post("/", tratarAsync(controller.criar.bind(controller)));
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));
    router.post("/:id/sortear", tratarAsync(controller.sortear.bind(controller)));
    router.post("/:id/refazer", tratarAsync(controller.refazer.bind(controller)));
    router.patch(
        "/:id/confirmar-entrega",
        tratarAsync(controller.confirmarEntrega.bind(controller)),
    );

    return router;
}
