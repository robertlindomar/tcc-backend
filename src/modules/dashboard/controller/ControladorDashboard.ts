import { NextFunction, Request, Response } from "express";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { resolverAssociacaoLogada } from "../../../shared/authz/resolverAssociacaoLogada";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoDashboard } from "../service/ServicoDashboard";

export class ControladorDashboard {
    constructor(
        private readonly servicoDashboard: ServicoDashboard,
        private readonly repositorioAssociacao: RepositorioAssociacao,
    ) {}

    async resumo(request: Request, response: Response, _next: NextFunction): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }

        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            request.usuario.id,
        );

        const resumo = await this.servicoDashboard.resumo(associacaoId);
        response.status(200).json(resumo);
    }
}
