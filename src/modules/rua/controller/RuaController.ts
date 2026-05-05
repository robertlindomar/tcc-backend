import { NextFunction, Request, Response } from "express";
import { RuaService } from "../service/RuaService";

export class RuaController {
    constructor(private readonly ruaService: RuaService) {}

    async listar(
        _request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const ruas = await this.ruaService.listar();
        response.status(200).json(ruas);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const rua = await this.ruaService.buscar(request.params.id);
        response.status(200).json(rua);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const rua = await this.ruaService.criar(request.body);
        response.status(201).json(rua);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const rua = await this.ruaService.atualizar(request.params.id, request.body);
        response.status(200).json(rua);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.ruaService.deletar(request.params.id);
        response.status(204).send();
    }
}
