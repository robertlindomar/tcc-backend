import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoSorteio } from "../service/ServicoSorteio";

export class ControladorSorteio {
    constructor(private readonly servicoSorteio: ServicoSorteio) {}

    async listar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const lista = await this.servicoSorteio.listar(request.usuario.id);
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoSorteio.buscar(request.usuario.id, request.params.id);
        response.status(200).json(item);
    }

    async sortear(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoSorteio.sortear(request.usuario.id, request.params.id);
        response.status(201).json(item);
    }

    async refazer(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoSorteio.refazer(request.usuario.id, request.params.id);
        response.status(201).json(item);
    }

    async confirmarEntrega(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoSorteio.confirmarEntrega(
            request.usuario.id,
            request.params.id,
        );
        response.status(200).json(item);
    }
}
