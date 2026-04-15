// src/routes.ts
import { Router } from "express";
import { BairroRoutes } from "./modules/bairro/routes";
import { UsuarioRoutes } from "./modules/usuario/routes";
import { CidadeRoutes } from "./modules/cidade/routes";
import { EstadoRoutes } from "./modules/estado/routes";
import { RuaRoutes } from "./modules/rua/routes";

export function routes() {
    const router = Router();

    router.use("/rua", RuaRoutes());
    router.use("/estado", EstadoRoutes());
    router.use("/cidade", CidadeRoutes());
    router.use("/bairro", BairroRoutes());
    router.use("/usuario", UsuarioRoutes());

    return router;
}
