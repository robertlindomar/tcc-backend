import { NextFunction, Request, Response } from "express";
import { CidadeService } from "../service/CidadeService";

export class CidadeController {
    constructor(private readonly cidadeService: CidadeService) {}

    async listar(
        _request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const lista = await this.cidadeService.listar();
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const item = await this.cidadeService.buscar(request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const criado = await this.cidadeService.criar(request.body);
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const atualizado = await this.cidadeService.atualizar(request.params.id, request.body);
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.cidadeService.deletar(request.params.id);
        response.status(204).send();
    }
}
