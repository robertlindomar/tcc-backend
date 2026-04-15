// src/routes.ts
import { Router } from "express";
import { CidadeRoutes } from "./modules/cidade/routes";
import { EstadoRoutes } from "./modules/estado/routes";
import { RuaRoutes } from "./modules/rua/routes";

export function routes() {
    const router = Router();

    router.use("/rua", RuaRoutes());
    router.use("/estado", EstadoRoutes());
    router.use("/cidade", CidadeRoutes());

    return router;
}
