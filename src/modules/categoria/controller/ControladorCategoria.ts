import { NextFunction, Request, Response } from "express";
import { ServicoCategoria } from "../service/ServicoCategoria";

export class ControladorCategoria {
    constructor(private readonly servicoCategoria: ServicoCategoria) {}

    async listar(
        _request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const lista = await this.servicoCategoria.listar();
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const item = await this.servicoCategoria.buscar(request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const criado = await this.servicoCategoria.criar(request.body);
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const atualizado = await this.servicoCategoria.atualizar(
            request.params.id,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.servicoCategoria.deletar(request.params.id);
        response.status(204).send();
    }
}
