import { NextFunction, Request, Response } from "express";
import { ServicoCadastro } from "../service/ServicoCadastro";
import { ServicoLogin } from "../service/ServicoLogin";

export class ControladorAuth {
    constructor(
        private readonly servicoLogin: ServicoLogin,
        private readonly servicoCadastro: ServicoCadastro,
    ) {}

    async login(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const resultado = await this.servicoLogin.executar(request.body);
        response.status(200).json(resultado);
    }

    async cadastro(request: Request, response: Response, _next: NextFunction): Promise<void> {
        const criado = await this.servicoCadastro.executar(request.body);
        response.status(201).json(criado);
    }
}
