import { StatusLojista } from "../../../generated/prisma/enums";
import { resolverConsumidorLogado } from "../../../shared/authz/resolverConsumidorLogado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import {
    calcularChavePeriodoMissao,
    missaoEstaExpirada,
} from "../../../shared/tempo/calcularChavePeriodoMissao";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { RespostaConsumidor } from "../../consumidor/dtos/RespostaConsumidor";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioMissao } from "../../missao/repository/RepositorioMissao";
import { extrairTokenQrMissao } from "../../../shared/utils/tokenQrMissao";
import { Missao } from "../../missao/model/Missao";
import { DTOConcluirMissaoPorToken } from "../dto/DTOConcluirMissaoPorToken";
import { RespostaConclusaoMissao } from "../dtos/RespostaConclusaoMissao";
import { RespostaMissaoConsumidor } from "../dtos/RespostaMissaoConsumidor";
import { MissaoConsumidor } from "../model/MissaoConsumidor";
import { RepositorioMissaoConsumidor } from "../repository/RepositorioMissaoConsumidor";

export class ServicoMissaoConsumidor {
    constructor(
        private readonly repositorioMissaoConsumidor: RepositorioMissaoConsumidor,
        private readonly repositorioMissao: RepositorioMissao,
        private readonly repositorioConsumidor: RepositorioConsumidor,
        private readonly repositorioLojista: RepositorioLojista,
    ) {}

    async concluirPorToken(
        usuarioId: number,
        request: DTOConcluirMissaoPorToken,
        agora: Date = new Date(),
    ): Promise<RespostaConclusaoMissao> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );

        const tokenQr = extrairTokenQrMissao(request.tokenQr);
        if (!tokenQr) {
            throw new ErroAplicacao("tokenQr invalido", 400);
        }

        const missao = await this.repositorioMissao.buscarPorTokenQr(tokenQr);
        if (!missao) {
            throw new ErroAplicacao("Missao nao encontrada", 404);
        }

        return this.concluirParaConsumidor(missao, consumidorId, agora);
    }

    async listar(usuarioId: number): Promise<RespostaMissaoConsumidor[]> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );
        const lista =
            await this.repositorioMissaoConsumidor.listarPorConsumidorId(consumidorId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaMissaoConsumidor> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );
        const id = this.parseId(idParam);
        const item = await this.repositorioMissaoConsumidor.buscar(id);

        if (!item || item.consumidorId !== consumidorId) {
            throw new ErroAplicacao("Missao concluida nao encontrada", 404);
        }

        return this.paraResposta(item);
    }

    private async concluirParaConsumidor(
        missao: Missao,
        consumidorId: number,
        agora: Date,
    ): Promise<RespostaConclusaoMissao> {
        if (missaoEstaExpirada(missao.dataFim, agora)) {
            throw new ErroAplicacao("Missao expirada", 400);
        }

        const lojista = await this.repositorioLojista.buscar(missao.lojistaId);
        if (!lojista || lojista.status !== StatusLojista.APROVADO) {
            throw new ErroAplicacao("Loja nao aprovada", 403);
        }

        const chavePeriodo = calcularChavePeriodoMissao(missao.frequencia, agora);
        const jaConcluida =
            await this.repositorioMissaoConsumidor.buscarPorMissaoConsumidorPeriodo(
                missao.id,
                consumidorId,
                chavePeriodo,
            );
        if (jaConcluida) {
            throw new ErroAplicacao("Missao ja concluida neste periodo", 409);
        }

        const { missaoConsumidor, consumidor } =
            await this.repositorioMissaoConsumidor.concluirComPontos({
                missaoId: missao.id,
                consumidorId,
                chavePeriodo,
                pontoRecompensa: missao.pontoRecompensa,
            });

        return {
            missaoConsumidor: this.paraResposta(missaoConsumidor, {
                nomeMissao: missao.nome,
                pontoRecompensa: missao.pontoRecompensa,
            }),
            consumidor: this.paraRespostaConsumidor(consumidor),
        };
    }

    private paraResposta(
        item: MissaoConsumidor,
        extras?: { nomeMissao?: string; pontoRecompensa?: number },
    ): RespostaMissaoConsumidor {
        const nomeMissao = extras?.nomeMissao ?? item.nomeMissao;
        const pontoRecompensa = extras?.pontoRecompensa ?? item.pontoRecompensa;

        const resposta: RespostaMissaoConsumidor = {
            id: item.id,
            missaoId: item.missaoId,
            consumidorId: item.consumidorId,
            chavePeriodo: item.chavePeriodo,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        };

        if (nomeMissao !== null && nomeMissao !== undefined) {
            resposta.nomeMissao = nomeMissao;
        }
        if (pontoRecompensa !== null && pontoRecompensa !== undefined) {
            resposta.pontoRecompensa = pontoRecompensa;
        }

        return resposta;
    }

    private paraRespostaConsumidor(consumidor: Consumidor): RespostaConsumidor {
        return {
            id: consumidor.id,
            cpf: consumidor.cpf,
            pontos: consumidor.pontos,
            nivel: consumidor.nivel,
            sexoId: consumidor.sexoId,
            lojistaId: consumidor.lojistaId,
            usuarioId: consumidor.usuarioId,
            dataCriacao: consumidor.dataCriacao,
            dataAtualizacao: consumidor.dataAtualizacao,
        };
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da missao concluida invalido", 400);
        }
        return id;
    }
}
