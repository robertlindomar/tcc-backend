import { NextFunction, Request, Response } from "express";
import { exigirUsuario } from "../../../shared/authz/exigirUsuario";
import { ServicoConsumidor } from "../service/ServicoConsumidor";

export class ControladorConsumidor {
    constructor(private readonly servicoConsumidor: ServicoConsumidor) {}

    async listar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const usuario = exigirUsuario(request);
        const lista = await this.servicoConsumidor.listar(usuario);
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const usuario = exigirUsuario(request);
        const item = await this.servicoConsumidor.buscar(request.params.id, usuario);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const usuario = exigirUsuario(request);
        const criado = await this.servicoConsumidor.criar(usuario.id, request.body);
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const usuario = exigirUsuario(request);
        const atualizado = await this.servicoConsumidor.atualizar(
            request.params.id,
            usuario,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const usuario = exigirUsuario(request);
        await this.servicoConsumidor.deletar(request.params.id, usuario);
        response.status(204).send();
    }
}
