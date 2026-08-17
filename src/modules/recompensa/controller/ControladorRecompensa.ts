import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoRecompensa } from "../service/ServicoRecompensa";

export class ControladorRecompensa {
    constructor(private readonly servicoRecompensa: ServicoRecompensa) {}

    async listar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const lista = await this.servicoRecompensa.listar(request.usuario.id);
        response.status(200).json(lista);
    }

    async catalogo(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const catalogo = await this.servicoRecompensa.catalogoConsumidor(request.usuario.id);
        response.status(200).json(catalogo);
    }

    async buscar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const item = await this.servicoRecompensa.buscar(
            request.usuario.id,
            request.params.id,
        );
        response.status(200).json(item);
    }

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const criado = await this.servicoRecompensa.criar(request.usuario.id, request.body);
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
        const atualizado = await this.servicoRecompensa.atualizar(
            request.usuario.id,
            request.params.id,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async desativar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const atualizado = await this.servicoRecompensa.desativar(
            request.usuario.id,
            request.params.id,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        await this.servicoRecompensa.deletar(request.usuario.id, request.params.id);
        response.status(204).send();
    }

    async resgatar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const resultado = await this.servicoRecompensa.resgatar(
            request.usuario.id,
            request.params.id,
            request.body,
        );
        response.status(201).json(resultado);
    }

    async listarResgates(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const lista = await this.servicoRecompensa.listarResgates(request.usuario.id);
        response.status(200).json(lista);
    }

    async listarResgatesLoja(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const lista = await this.servicoRecompensa.listarResgatesLoja(request.usuario.id);
        response.status(200).json(lista);
    }

    async confirmarEntrega(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        const atualizado = await this.servicoRecompensa.confirmarEntrega(
            request.usuario.id,
            request.params.id,
        );
        response.status(200).json(atualizado);
    }
}
