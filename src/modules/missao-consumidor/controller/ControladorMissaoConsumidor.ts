import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoMissaoConsumidor } from "../service/ServicoMissaoConsumidor";

export class ControladorMissaoConsumidor {
    constructor(private readonly servicoMissaoConsumidor: ServicoMissaoConsumidor) {}

    async listar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const lista = await this.servicoMissaoConsumidor.listar(request.usuario.id);
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoMissaoConsumidor.buscar(
            request.usuario.id,
            request.params.id,
        );
        response.status(200).json(item);
    }

    async concluirPorToken(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const criado = await this.servicoMissaoConsumidor.concluirPorToken(
            request.usuario.id,
            request.body,
        );
        response.status(201).json(criado);
    }
}
