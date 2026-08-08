import { NextFunction, Request, Response } from "express";
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
        const criado = await this.servicoCriarEndereco.executar(request.body);
        response.status(201).json(criado);
    }

    async buscarPorUsuario(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const endereco = await this.servicoEncontrarEnderecoPorUsuario.executar(
            request.params.usuarioId,
        );
        response.status(200).json(endereco);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const atualizado = await this.servicoAtualizarEndereco.executar(
            request.params.id,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.servicoDeletarEndereco.executar(request.params.id);
        response.status(204).send();
    }
}
