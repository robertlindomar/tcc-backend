import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { receberArquivoImagem } from "../../../shared/middlewares/receberArquivoImagem";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorEvento } from "../factory/criarControladorEvento";

export function RotasEvento() {
    const router = Router();
    const controller = criarControladorEvento();

    router.use(garantirAutenticado);
    router.use(garantirPapel(Role.LOJISTA));

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post("/", tratarAsync(controller.criar.bind(controller)));
    router.put(
        "/:id/imagem",
        receberArquivoImagem,
        tratarAsync(controller.definirImagem.bind(controller)),
    );
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
