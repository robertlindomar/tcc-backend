import { NextFunction, Request, Response } from "express";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { resolverConsumidorLogado } from "../../../shared/authz/resolverConsumidorLogado";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { DTOProcessarNfce } from "../dto/DTOProcessarNfce";
import { RespostaProcessamentoNfce } from "../dtos/RespostaProcessamentoNfce";
import { ResultadoProcessarNfce, ServicoProcessarNfce } from "../service/ServicoProcessarNfce";

export class ControladorNfce {
    constructor(
        private readonly servicoProcessarNfce: ServicoProcessarNfce,
        private readonly repositorioConsumidor: RepositorioConsumidor,
    ) {}

    async listarCampanhasVigentes(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }
        await resolverConsumidorLogado(this.repositorioConsumidor, request.usuario.id);
        const lista = await this.servicoProcessarNfce.listarCampanhasVigentes();
        response.status(200).json(lista);
    }

    async processar(
        request: Request,
        response: Response,
        _next: NextFunction,
    ): Promise<void> {
        if (!request.usuario) {
            throw new ErroAplicacao("Usuario nao autenticado", 401);
        }

        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            request.usuario.id,
        );

        const body = this.validarBody(request.body);
        const resultado = await this.servicoProcessarNfce.processar({
            consumidorId,
            payloadQr: body.payloadQr,
            campanhaId: body.campanhaId,
        });

        response.status(201).json(this.paraResposta(resultado));
    }

    private validarBody(body: unknown): DTOProcessarNfce {
        if (body === null || typeof body !== "object") {
            throw new ErroAplicacao("Body invalido", 400);
        }
        const dados = body as Record<string, unknown>;

        if (typeof dados.payloadQr !== "string" || !dados.payloadQr.trim()) {
            throw new ErroAplicacao("payloadQr e obrigatorio", 400);
        }

        let campanhaId: number | undefined;
        if (dados.campanhaId !== undefined && dados.campanhaId !== null) {
            const id = Number(dados.campanhaId);
            if (!Number.isInteger(id) || id <= 0) {
                throw new ErroAplicacao("campanhaId invalido", 400);
            }
            campanhaId = id;
        }

        return {
            payloadQr: dados.payloadQr.trim(),
            campanhaId,
        };
    }

    private paraResposta(resultado: ResultadoProcessarNfce): RespostaProcessamentoNfce {
        return {
            id: resultado.processamentoId,
            campanhaId: resultado.campanhaId,
            chaveAcesso: resultado.chaveAcesso,
            valorNota: resultado.valorNota,
            ticketsGerados: resultado.ticketsGerados,
            residualAntes: resultado.residualAntes,
            residualApos: resultado.residualApos,
            ticketsTotaisCampanha: resultado.ticketsTotaisCampanha,
            lojistaId: resultado.lojistaId,
            dataEmissao: resultado.dataEmissao,
            modoSimulado: true,
        };
    }
}
