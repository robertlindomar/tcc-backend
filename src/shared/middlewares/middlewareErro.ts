import { ErrorRequestHandler } from "express";
import { ErroAplicacao } from "../erros/ErroAplicacao";

export const middlewareErro: ErrorRequestHandler = (err, req, res, next) => {
    if (err instanceof ErroAplicacao) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }
    res.status(500).json({ error: "Erro interno do servidor" });
};
