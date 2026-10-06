import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../auth/enum/Role";
import { middlewareErro } from "../../../shared/middlewares/middlewareErro";
import { ControladorSorteio } from "../controller/ControladorSorteio";
import { RotasSorteio } from "./sorteio.rotas";

const SECRET_TESTE = "segredo-teste-sorteio-rotas";

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

describe("rotas /sorteio (G17)", () => {
    let sortear: ReturnType<typeof vi.fn>;
    let refazer: ReturnType<typeof vi.fn>;
    let confirmarEntrega: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.SECRET_KEY = SECRET_TESTE;
        sortear = vi.fn(async (req, res) => res.status(201).json({ acao: "sortear", id: req.params.id }));
        refazer = vi.fn(async (req, res) => res.status(201).json({ acao: "refazer", id: req.params.id }));
        confirmarEntrega = vi.fn(async (req, res) =>
            res.status(200).json({ acao: "confirmar", id: req.params.id }),
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    function criarApp() {
        const controller = {
            listar: vi.fn(),
            buscar: vi.fn(),
            criar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
            sortear,
            refazer,
            confirmarEntrega,
        } as unknown as ControladorSorteio;
        const app = express();
        app.use(express.json());
        app.use("/sorteio", RotasSorteio(controller));
        app.use(middlewareErro);
        return app;
    }

    it("sem token responde 401", async () => {
        await comServidor(criarApp(), async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/sorteio/1/sortear`, { method: "POST" });
            expect(resposta.status).toBe(401);
            expect(sortear).not.toHaveBeenCalled();
        });
    });

    it("token CONSUMIDOR responde 403", async () => {
        await comServidor(criarApp(), async (baseUrl) => {
            const resposta = await fetch(`${baseUrl}/sorteio/1/sortear`, {
                method: "POST",
                headers: { Authorization: `Bearer ${tokenPara(Role.CONSUMIDOR)}` },
            });
            expect(resposta.status).toBe(403);
            expect(sortear).not.toHaveBeenCalled();
        });
    });

    it("ASSOCIACAO acessa sortear, refazer e confirmar-entrega", async () => {
        const headers = { Authorization: `Bearer ${tokenPara(Role.ASSOCIACAO)}` };
        await comServidor(criarApp(), async (baseUrl) => {
            const r1 = await fetch(`${baseUrl}/sorteio/7/sortear`, { method: "POST", headers });
            expect(r1.status).toBe(201);
            expect(await r1.json()).toEqual({ acao: "sortear", id: "7" });

            const r2 = await fetch(`${baseUrl}/sorteio/7/refazer`, { method: "POST", headers });
            expect(r2.status).toBe(201);
            expect(await r2.json()).toEqual({ acao: "refazer", id: "7" });

            const r3 = await fetch(`${baseUrl}/sorteio/7/confirmar-entrega`, {
                method: "PATCH",
                headers,
            });
            expect(r3.status).toBe(200);
            expect(await r3.json()).toEqual({ acao: "confirmar", id: "7" });
        });
    });
});
