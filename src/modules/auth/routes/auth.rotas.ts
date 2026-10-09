import { Router } from "express";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { criarControladorAuth } from "../factory/criarControladorAuth";

export function RotasAuth() {
    const router = Router();
    const controller = criarControladorAuth();

    router.post("/login", tratarAsync(controller.login.bind(controller)));
    router.post("/cadastro", tratarAsync(controller.cadastro.bind(controller)));
    router.post(
        "/cadastro-consumidor",
        tratarAsync(controller.cadastroConsumidor.bind(controller)),
    );

    return router;
}
