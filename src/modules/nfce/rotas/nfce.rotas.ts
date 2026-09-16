import { NextFunction, Request, Response, Router } from "express";
import { Role } from "../../auth/enum/Role";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { garantirAutenticado } from "../../../shared/middlewares/garantirAutenticado";
import { garantirPapel } from "../../../shared/middlewares/garantirPapel";
import { tratarAsync } from "../../../shared/utils/tratarAsync";
import { ControladorNfce } from "../controller/ControladorNfce";
import { criarControladorNfce } from "../factory/criarControladorNfce";
import { verificarRateLimitNfce } from "../middleware/rateLimitNfce";

function rateLimitProcessarNfce(request: Request, _response: Response, next: NextFunction): void {
    if (!request.usuario) {
        next();
        return;
    }
    const payloadQr =
        request.body && typeof request.body === "object"
            ? String((request.body as { payloadQr?: unknown }).payloadQr ?? "")
            : "";
    const ip =
        (typeof request.headers["x-forwarded-for"] === "string"
            ? request.headers["x-forwarded-for"].split(",")[0]?.trim()
            : undefined) ||
        request.ip ||
        "desconhecido";

    const resultado = verificarRateLimitNfce({
        usuarioId: request.usuario.id,
        ip,
        payloadQr,
    });
    if (!resultado.ok) {
        next(
            new ErroAplicacao("Muitas tentativas de processar NFC-e", 429, {
                codigo: resultado.motivo,
            }),
        );
        return;
    }
    next();
}

export function RotasNfce(controller: ControladorNfce = criarControladorNfce()) {
    const router = Router();

    router.use(garantirAutenticado);
    router.use(garantirPapel(Role.CONSUMIDOR));

    router.get(
        "/campanhas-vigentes",
        tratarAsync(controller.listarCampanhasVigentes.bind(controller)),
    );
    router.post(
        "/processar",
        rateLimitProcessarNfce,
        tratarAsync(controller.processar.bind(controller)),
    );

    return router;
}
