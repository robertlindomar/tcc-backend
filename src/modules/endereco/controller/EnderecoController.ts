import { NextFunction, Request, Response } from "express";
import { CreateEnderecoService } from "../service/CreateEnderecoService";
import { DeleteEnderecoService } from "../service/DeleteEnderecoService";
import { EncontrarEnderecoPorUsuarioService } from "../service/EncontrarEnderecoPorUsuarioService";
import { UpdateEnderecoService } from "../service/UpdateEnderecoService";

export class EnderecoController {
    constructor(
        private readonly createEnderecoService: CreateEnderecoService,
        private readonly updateEnderecoService: UpdateEnderecoService,
        private readonly encontrarEnderecoPorUsuarioService: EncontrarEnderecoPorUsuarioService,
        private readonly deleteEnderecoService: DeleteEnderecoService,
    ) {}

    async criar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const criado = await this.createEnderecoService.executar(request.body);
        response.status(201).json(criado);
    }

    async buscarPorUsuario(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const endereco = await this.encontrarEnderecoPorUsuarioService.executar(
            request.params.usuarioId,
        );
        response.status(200).json(endereco);
    }

    async atualizar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        const atualizado = await this.updateEnderecoService.executar(
            request.params.id,
            request.body,
        );
        response.status(200).json(atualizado);
    }

    async deletar(request: Request, response: Response, _next: NextFunction): Promise<void> {
        await this.deleteEnderecoService.executar(request.params.id);
        response.status(204).send();
    }
}
