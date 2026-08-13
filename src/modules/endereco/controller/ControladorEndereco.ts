import { NextFunction, Request, Response } from "express";
import { exigirUsuario } from "../../../shared/authz/exigirUsuario";
import { ServicoAtualizarEndereco } from "../service/ServicoAtualizarEndereco";
import { ServicoCriarEndereco } from "../service/ServicoCriarEndereco";
import { ServicoDeletarEndereco } from "../service/ServicoDeletarEndereco";
import { ServicoEncontrarEnderecoPorUsuario } from "../service/ServicoEncontrarEnderecoPorUsuario";

export class ControladorEndereco {
    constructor(
        private readonly servicoCriarEndereco: ServicoCriarEndereco,
        private readonly servicoAtualizarEndereco: ServicoAtualizarEndereco,
        private readonly servicoEncontrarEnderecoPorUsuario: ServicoEncontrarEnderecoPorUsuario,
        private readonly servicoDeletarEndereco: ServicoDeletarEndereco,
    ) {}

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const usuario = exigirUsuario(request);
        const criado = await this.servicoCriarEndereco.executar(usuario.id, request.body);
        response.status(201).json(criado);
    }

    async buscarPorUsuario(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const usuario = exigirUsuario(request);
        const endereco = await this.servicoEncontrarEnderecoPorUsuario.executar(
            request.params.usuarioId,
            usuario.id,
        );
        response.status(200).json(endereco);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const usuario = exigirUsuario(request);
        const atualizado = await this.servicoAtualizarEndereco.executar(
            request.params.id,
            usuario.id,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const usuario = exigirUsuario(request);
        await this.servicoDeletarEndereco.executar(request.params.id, usuario.id);
        response.status(204).send();
    }
}
