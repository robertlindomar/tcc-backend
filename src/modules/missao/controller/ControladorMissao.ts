import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoMissao } from "../service/ServicoMissao";

export class ControladorMissao {
    constructor(private readonly servicoMissao: ServicoMissao) {}

    async catalogo(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const lojistaId =
            typeof request.query.lojistaId === "string" ? request.query.lojistaId : "";
        const lista = await this.servicoMissao.listarCatalogo(lojistaId);
        response.status(200).json(lista);
    }

    async listar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const lista = await this.servicoMissao.listar(request.usuario.id);
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoMissao.buscar(request.usuario.id, request.params.id);
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const criado = await this.servicoMissao.criar(request.usuario.id, request.body);
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
        const atualizado = await this.servicoMissao.atualizar(
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
        await this.servicoMissao.deletar(request.usuario.id, request.params.id);
        response.status(204).send();
    }
}
