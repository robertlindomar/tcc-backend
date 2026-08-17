import { Router } from "express";
import { Role } from "../../auth/enum/Role";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { receberArquivoImagem } from "../../../shared/middlewares/receberArquivoImagem";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorProduto } from "../factory/criarControladorProduto";

export function RotasProduto() {
    const router = Router();
    const controller = criarControladorProduto();

    router.use(garantirAutenticado);
    router.use(garantirPapel(Role.LOJISTA));

    router.get("/", tratarAsync(controller.listar.bind(controller)));
    router.get("/:id", tratarAsync(controller.buscar.bind(controller)));
    router.post(
        "/",
        receberArquivoImagem,
        tratarAsync(controller.criar.bind(controller)),
    );
    router.put(
        "/:id/imagem",
        receberArquivoImagem,
        tratarAsync(controller.definirImagem.bind(controller)),
    );
    router.put("/:id", tratarAsync(controller.atualizar.bind(controller)));
    router.delete("/:id", tratarAsync(controller.deletar.bind(controller)));

    return router;
}
