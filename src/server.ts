// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { routes } from "./routes";
import { middlewareErro } from "./shared/middlewares/middlewareErro";
import { diretorioUploads } from "./shared/upload/ArmazenamentoDiscoLocal";

const app = express();

app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
});
app.use(
    "/uploads",
    express.static(diretorioUploads(), {
        index: false,
        fallthrough: false,
    }),
);

app.use(routes());
app.use(middlewareErro);

// Middleware de tratamento de erros (sempre no final)
app.use(middlewareErro);
// Iniciar servidor (0.0.0.0: Docker / Coolify / LAN mobile)
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta http://0.0.0.0:${PORT}`);
});
