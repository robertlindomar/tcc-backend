// src/routes.ts
import { Router } from "express";
import { RuaRoutes } from "./modules/rua/routes";

export function routes() {
    const router = Router();

    router.use("/rua", RuaRoutes());

    return router;
}
