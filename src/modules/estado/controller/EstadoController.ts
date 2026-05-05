import { NextFunction, Request, Response } from "express";
import { EstadoService } from "../service/EstadoService";

export class EstadoController {
    constructor(private readonly estadoService: EstadoService) {}

    async listar(
        _request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const lista = await this.estadoService.listar();
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const item = await this.estadoService.buscar(request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const criado = await this.estadoService.criar(request.body);
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const atualizado = await this.estadoService.atualizar(request.params.id, request.body);
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.estadoService.deletar(request.params.id);
        response.status(204).send();
    }
}
