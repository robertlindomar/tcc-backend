import { Request, Response } from "express";
import { exigirUsuario } from "../../../shared/authz/exigirUsuario";
import { ServicoAvisoSorteio } from "./ServicoAvisoSorteio";

export class ControladorAvisoSorteio {
    constructor(private readonly servico: ServicoAvisoSorteio) {}

    async listar(request: Request, response: Response): Promise<void> {
        response.json(await this.servico.listar(exigirUsuario(request).id));
    }

    async confirmarLeitura(request: Request, response: Response): Promise<void> {
        response.json(await this.servico.confirmarLeitura(exigirUsuario(request).id, request.params.resultadoId));
    }

    async ocultar(request: Request, response: Response): Promise<void> {
        await this.servico.ocultar(exigirUsuario(request).id, request.params.resultadoId);
        response.status(204).send();
    }
}
