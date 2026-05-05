import { NextFunction, Request, Response } from "express";
import { UsuarioService } from "../service/UsuarioService";

export class UsuarioController {
    constructor(private readonly usuarioService: UsuarioService) {}

    async listar(
        _request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const lista = await this.usuarioService.listar();
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const item = await this.usuarioService.buscar(request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const criado = await this.usuarioService.criar(request.body);
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const atualizado = await this.usuarioService.atualizar(request.params.id, request.body);
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.usuarioService.deletar(request.params.id);
        response.status(204).send();
    }
}
