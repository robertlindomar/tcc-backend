import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoLojista } from "../service/ServicoLojista";

export class ControladorLojista {
    constructor(private readonly servicoLojista: ServicoLojista) {}

    async listar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const status =
            typeof request.query.status === "string" ? request.query.status : undefined;
        const lista = await this.servicoLojista.listar(
            { id: request.usuario.id, role: request.usuario.role },
            status,
        );
        response.status(200).json(lista);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoLojista.buscar(request.params.id, {
            id: request.usuario.id,
            role: request.usuario.role,
        });
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }

        const criado = await this.servicoLojista.criar(request.usuario.id, request.body);
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

        const atualizado = await this.servicoLojista.atualizar(
            request.params.id,
            request.usuario,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async aprovar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }

        const atualizado = await this.servicoLojista.aprovar(
            request.params.id,
            request.usuario.id,
        );
        response.status(200).json(atualizado);
    }

    async rejeitar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }

        const atualizado = await this.servicoLojista.rejeitar(
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

        await this.servicoLojista.deletar(request.params.id, request.usuario);
        response.status(204).send();
    }
}
