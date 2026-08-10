import { resolverConsumidorLogado } from "../../../shared/authz/resolverConsumidorLogado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { RespostaConsumidor } from "../../consumidor/dtos/RespostaConsumidor";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioMissao } from "../../missao/repository/RepositorioMissao";
import { DTOCriarMissaoConsumidor } from "../dto/DTOCriarMissaoConsumidor";
import { RespostaConclusaoMissao } from "../dtos/RespostaConclusaoMissao";
import { RespostaMissaoConsumidor } from "../dtos/RespostaMissaoConsumidor";
import { MissaoConsumidor } from "../model/MissaoConsumidor";
import { RepositorioMissaoConsumidor } from "../repository/RepositorioMissaoConsumidor";

export class ServicoMissaoConsumidor {
    constructor(
        private readonly repositorioMissaoConsumidor: RepositorioMissaoConsumidor,
        private readonly repositorioMissao: RepositorioMissao,
        private readonly repositorioConsumidor: RepositorioConsumidor,
    ) {}

    async criar(
        usuarioId: number,
        request: DTOCriarMissaoConsumidor,
    ): Promise<RespostaConclusaoMissao> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );

        const missaoId = this.validarMissaoId(request.missaoId);
        const missao = await this.repositorioMissao.buscar(missaoId);

        if (!missao) {
            throw new ErroAplicacao("Missao nao encontrada", 404);
        }

        const jaConcluida = await this.repositorioMissaoConsumidor.buscarPorMissaoEConsumidor(
            missaoId,
            consumidorId,
        );
        if (jaConcluida) {
            throw new ErroAplicacao("Missao ja concluida", 400);
        }

        const { missaoConsumidor, consumidor } =
            await this.repositorioMissaoConsumidor.concluirComPontos({
                missaoId,
                consumidorId,
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

    private validarMissaoId(valor: unknown): number {
        const id = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("missaoId invalido", 400);
        }
        return id;
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da missao concluida invalido", 400);
        }
        return id;
    }
}
