import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoPromocao } from "../service/ServicoPromocao";

export class ControladorPromocao {
    constructor(private readonly servicoPromocao: ServicoPromocao) {}

    async listar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const lista = await this.servicoPromocao.listar(request.usuario.id);
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoPromocao.buscar(request.usuario.id, request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const criado = await this.servicoPromocao.criar(request.usuario.id, request.body);
        response.status(201).json(criado);
    }

    async desativar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const atualizado = await this.servicoPromocao.desativar(
            request.usuario.id,
            request.params.id,
        );
        response.status(200).json(atualizado);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const atualizado = await this.servicoPromocao.atualizar(
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
        await this.servicoPromocao.deletar(request.usuario.id, request.params.id);
        response.status(204).send();
    }
}
