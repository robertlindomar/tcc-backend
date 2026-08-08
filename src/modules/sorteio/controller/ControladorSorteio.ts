import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoSorteio } from "../service/ServicoSorteio";

export class ControladorSorteio {
    constructor(private readonly servicoSorteio: ServicoSorteio) {}

    async listar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const lista = await this.servicoSorteio.listar(request.usuario.id);
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoSorteio.buscar(request.usuario.id, request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const criado = await this.servicoSorteio.criar(request.usuario.id, request.body);
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
        const atualizado = await this.servicoSorteio.atualizar(
            request.usuario.id,
            request.params.id,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        await this.servicoSorteio.deletar(request.usuario.id, request.params.id);
        response.status(204).send();
    }
}
