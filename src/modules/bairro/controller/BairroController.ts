import { NextFunction, Request, Response } from "express";
import { BairroService } from "../service/BairroService";

export class BairroController {
    constructor(private readonly bairroService: BairroService) {}

    async listar(
        _request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const lista = await this.bairroService.listar();
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const item = await this.bairroService.buscar(request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const criado = await this.bairroService.criar(request.body);
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const atualizado = await this.bairroService.atualizar(request.params.id, request.body);
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.bairroService.deletar(request.params.id);
        response.status(204).send();
    }
}
