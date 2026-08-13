import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../auth/enum/Role";
import { middlewareErro } from "../../../shared/middlewares/middlewareErro";
import { ControladorDashboard } from "../controller/ControladorDashboard";
import { RotasDashboard } from "./dashboard.rotas";

const SECRET_TESTE = "segredo-teste-dashboard-rotas";

type RespostaResumo = {
    metricas: {
        lojasAguardandoAprovacao: number;
        campanhasCadastradas: number;
        sorteiosCadastrados: number;
        totalLojasParticipantes: number;
    };
    atividadesRecentes: unknown[];
};

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

describe("GET /dashboard/resumo (rotas)", () => {
    let resumoMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.SECRET_KEY = SECRET_TESTE;
        resumoMock = vi.fn(async (_req, res) => {
            res.status(200).json({
                metricas: {
                    lojasAguardandoAprovacao: 0,
                    campanhasCadastradas: 0,
                    sorteiosCadastrados: 0,
                    totalLojasParticipantes: 0,
                },
                atividadesRecentes: [],
            });
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    function criarApp() {
        const controller = {
            resumo: resumoMock,
        } as unknown as ControladorDashboard;
        const app = express();
        app.use(express.json());
        app.use("/dashboard", RotasDashboard(controller));
        app.use(middlewareErro);
        return app;
    }

    it("sem token responde 401", async () => {
        const app = criarApp();
        await comServidor(app, async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/dashboard/resumo`);
            expect(resposta.status).toBe(401);
            expect(resumoMock).not.toHaveBeenCalled();
        });
    });

    it("token LOJISTA responde 403", async () => {
        const app = criarApp();
        await comServidor(app, async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/dashboard/resumo`, {
                headers: { Authorization: `Bearer ${tokenPara(Role.LOJISTA)}` },
            });
            expect(resposta.status).toBe(403);
            expect(resumoMock).not.toHaveBeenCalled();
        });
    });

    it("token ASSOCIACAO responde 200", async () => {
        const app = criarApp();
        await comServidor(app, async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/dashboard/resumo`, {
                headers: { Authorization: `Bearer ${tokenPara(Role.ASSOCIACAO)}` },
            });
            expect(resposta.status).toBe(200);
            expect(resumoMock).toHaveBeenCalledTimes(1);
            const corpo = (await resposta.json()) as RespostaResumo;
            expect(corpo.metricas).toEqual({
                lojasAguardandoAprovacao: 0,
                campanhasCadastradas: 0,
                sorteiosCadastrados: 0,
                totalLojasParticipantes: 0,
            });
        });
    });
});
