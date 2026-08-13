import { NextFunction, Request, Response } from "express";
import { exigirUsuario } from "../../../shared/authz/exigirUsuario";
import { ServicoUsuario } from "../service/ServicoUsuario";

export class ControladorUsuario {
    constructor(private readonly servicoUsuario: ServicoUsuario) {}

    async listar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        exigirUsuario(request);
        const lista = await this.servicoUsuario.listar();
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const usuario = exigirUsuario(request);
        const item = await this.servicoUsuario.buscar(request.params.id, usuario.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        exigirUsuario(request);
        const criado = await this.servicoUsuario.criarViaHttp();
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const usuario = exigirUsuario(request);
        const atualizado = await this.servicoUsuario.atualizar(
            request.params.id,
            usuario.id,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const usuario = exigirUsuario(request);
        await this.servicoUsuario.deletar(request.params.id, usuario.id);
        response.status(204).send();
    }
}
