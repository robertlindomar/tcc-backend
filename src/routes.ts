import { Router } from "express";
import { EnderecoRoutes } from "./modules/endereco/routes/endereco.routes";
import { UsuarioRoutes } from "./modules/usuario/routes";

export function routes() {
    const router = Router();

    router.use("/endereco", EnderecoRoutes());
    router.use("/usuario", UsuarioRoutes());

    return router;
}
