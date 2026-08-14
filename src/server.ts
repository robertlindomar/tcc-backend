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
// Iniciar servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
