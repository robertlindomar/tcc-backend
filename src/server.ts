// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { routes } from "./routes";
import { middlewareErro } from "./shared/middlewares/middlewareErro";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use(routes());

// Middleware de tratamento de erros (sempre no final)
app.use(middlewareErro);
// Iniciar servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
