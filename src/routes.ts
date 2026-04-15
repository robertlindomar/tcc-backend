// src/routes.ts
import { Router } from "express";
import { EstadoRoutes } from "./modules/estado/routes";
import { RuaRoutes } from "./modules/rua/routes";

export function routes() {
    const router = Router();

    router.use("/rua", RuaRoutes());
    router.use("/estado", EstadoRoutes());

    return router;
}
