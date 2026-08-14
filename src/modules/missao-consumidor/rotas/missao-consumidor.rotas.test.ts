import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../auth/enum/Role";
import { middlewareErro } from "../../../shared/middlewares/middlewareErro";
import { ControladorMissaoConsumidor } from "../controller/ControladorMissaoConsumidor";
import { RotasMissaoConsumidor } from "./missao-consumidor.rotas";

const SECRET_TESTE = "segredo-teste-missao-consumidor-rotas";

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

describe("POST /missao-consumidor (rotas)", () => {
    let concluirPorTokenMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.SECRET_KEY = SECRET_TESTE;
        concluirPorTokenMock = vi.fn(async (_req, res) => {
            res.status(201).json({ ok: true });
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    function criarApp() {
        const controller = {
            listar: vi.fn(),
            buscar: vi.fn(),
            concluirPorToken: concluirPorTokenMock,
        } as unknown as ControladorMissaoConsumidor;
        const app = express();
        app.use(express.json());
        app.use("/missao-consumidor", RotasMissaoConsumidor(controller));
        app.use(middlewareErro);
        return app;
    }

    it("POST /missao-consumidor com missaoId nao conclui (404)", async () => {
        const app = criarApp();
        await comServidor(app, async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/missao-consumidor`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tokenPara(Role.CONSUMIDOR)}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ missaoId: 1 }),
            });
            expect(resposta.status).toBe(404);
            expect(concluirPorTokenMock).not.toHaveBeenCalled();
        });
    });

    it("POST /missao-consumidor/concluir com token chama o fluxo oficial", async () => {
        const app = criarApp();
        await comServidor(app, async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/missao-consumidor/concluir`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tokenPara(Role.CONSUMIDOR)}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tokenQr: "ab".repeat(32) }),
            });
            expect(resposta.status).toBe(201);
            expect(concluirPorTokenMock).toHaveBeenCalledOnce();
        });
    });
});
