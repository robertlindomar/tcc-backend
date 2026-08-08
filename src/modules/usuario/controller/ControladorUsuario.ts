import { NextFunction, Request, Response } from "express";
import { ServicoUsuario } from "../service/ServicoUsuario";

export class ControladorUsuario {
    constructor(private readonly servicoUsuario: ServicoUsuario) {}

    async listar(
        _request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const lista = await this.servicoUsuario.listar();
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const item = await this.servicoUsuario.buscar(request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const criado = await this.servicoUsuario.criar(request.body);
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const atualizado = await this.servicoUsuario.atualizar(request.params.id, request.body);
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.servicoUsuario.deletar(request.params.id);
        response.status(204).send();
    }
}
