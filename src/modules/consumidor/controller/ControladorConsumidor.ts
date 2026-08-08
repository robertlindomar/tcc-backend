import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoConsumidor } from "../service/ServicoConsumidor";

export class ControladorConsumidor {
    constructor(private readonly servicoConsumidor: ServicoConsumidor) {}

    async listar(
        _request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const lista = await this.servicoConsumidor.listar();
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const item = await this.servicoConsumidor.buscar(request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }

        const criado = await this.servicoConsumidor.criar(
            request.usuario.id,
            request.body,
        );
        response.status(201).json(criado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }

        const atualizado = await this.servicoConsumidor.atualizar(
            request.params.id,
            request.usuario.id,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }

        await this.servicoConsumidor.deletar(request.params.id, request.usuario.id);
        response.status(204).send();
    }
}
