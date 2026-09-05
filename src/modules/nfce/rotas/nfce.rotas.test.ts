import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../auth/enum/Role";
import { middlewareErro } from "../../../shared/middlewares/middlewareErro";
import { ControladorNfce } from "../controller/ControladorNfce";
import { RotasNfce } from "./nfce.rotas";

const SECRET_TESTE = "segredo-teste-nfce-rotas";

function tokenPara(role: Role, id = 1): string {
    return jwt.sign({ sub: id, role }, SECRET_TESTE, { expiresIn: "1h" });
}

async function comServidor(
    app: express.Express,
    executar: (baseUrl: string) => Promise<void>,
): Promise<void> {
    const servidor = http.createServer(app);
    await new Promise<void>((resolve) => {
        servidor.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = servidor.address() as AddressInfo;
    try {
        await executar(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise<void>((resolve, reject) => {
            servidor.close((erro) => (erro ? reject(erro) : resolve()));
        });
    }
}

describe("POST /nfce/processar (rotas)", () => {
    let processarMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.SECRET_KEY = SECRET_TESTE;
        processarMock = vi.fn(async (_req, res) => {
            res.status(201).json({
                ticketsGerados: 5,
                residualApos: 5,
                ticketsTotaisCampanha: 5,
                modoSimulado: true,
            });
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    function criarApp() {
        const controller = {
            processar: processarMock,
        } as unknown as ControladorNfce;
        const app = express();
        app.use(express.json());
        app.use("/nfce", RotasNfce(controller));
        app.use(middlewareErro);
        return app;
    }

    it("CONSUMIDOR autenticado chama processar", async () => {
        const app = criarApp();
        await comServidor(app, async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/nfce/processar`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tokenPara(Role.CONSUMIDOR)}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    payloadQr: "35260944444444000144650010000000011123456780",
                    campanhaId: 1,
                }),
            });
            expect(resposta.status).toBe(201);
            expect(processarMock).toHaveBeenCalledOnce();
            const body = await resposta.json();
            expect(body.modoSimulado).toBe(true);
            expect(body.ticketsGerados).toBe(5);
        });
    });

    it("sem token → 401", async () => {
        const app = criarApp();
        await comServidor(app, async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/nfce/processar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payloadQr: "x" }),
            });
            expect(resposta.status).toBe(401);
            expect(processarMock).not.toHaveBeenCalled();
        });
    });

    it("LOJISTA → 403", async () => {
        const app = criarApp();
        await comServidor(app, async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/nfce/processar`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tokenPara(Role.LOJISTA)}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ payloadQr: "x" }),
            });
            expect(resposta.status).toBe(403);
            expect(processarMock).not.toHaveBeenCalled();
        });
    });
});
