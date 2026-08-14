import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { TAMANHO_MAXIMO_IMAGEM_BYTES } from "../upload/regrasImagem";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANHO_MAXIMO_IMAGEM_BYTES, files: 1 },
});

export function receberArquivoImagem(
    request: Request,
    response: Response,
    next: NextFunction,
): void {
    upload.single("arquivo")(request, response, (erro: unknown) => {
        if (!erro) {
            next();
            return;
        }
        if (
            typeof erro === "object" &&
            erro !== null &&
            "code" in erro &&
            (erro as { code: string }).code === "LIMIT_FILE_SIZE"
        ) {
            next(new ErroAplicacao("Arquivo excede o limite de 2MB", 400));
            return;
        }
        next(new ErroAplicacao("Falha no envio do arquivo", 400));
    });
}
