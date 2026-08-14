import { resolverConsumidorLogado } from "../../../shared/authz/resolverConsumidorLogado";
import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { RespostaConsumidor } from "../../consumidor/dtos/RespostaConsumidor";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { DTOAtualizarRecompensa } from "../dto/DTOAtualizarRecompensa";
import { DTOCriarRecompensa } from "../dto/DTOCriarRecompensa";
import { RespostaCatalogoRecompensa } from "../dtos/RespostaCatalogoRecompensa";
import { RespostaEfetuarResgate } from "../dtos/RespostaEfetuarResgate";
import { RespostaRecompensa } from "../dtos/RespostaRecompensa";
import { RespostaResgateRecompensa } from "../dtos/RespostaResgateRecompensa";
import { Recompensa } from "../model/Recompensa";
import { ResgateRecompensa } from "../model/ResgateRecompensa";
import { RepositorioRecompensa } from "../repository/RepositorioRecompensa";
import { RepositorioResgateRecompensa } from "../repository/RepositorioResgateRecompensa";

export class ServicoRecompensa {
    constructor(
        private readonly repositorioRecompensa: RepositorioRecompensa,
        private readonly repositorioResgate: RepositorioResgateRecompensa,
        private readonly repositorioLojista: RepositorioLojista,
        private readonly repositorioConsumidor: RepositorioConsumidor,
    ) {}

    async criar(usuarioId: number, request: DTOCriarRecompensa): Promise<RespostaRecompensa> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const criado = await this.repositorioRecompensa.criar({
            nome: this.validarNome(request.nome),
            descricao: this.validarDescricaoOpcional(request.descricao),
            custoPontos: this.validarCustoPontos(request.custoPontos),
            lojistaId,
        });
        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaRecompensa[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioRecompensa.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaRecompensa> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const recompensa = await this.obterDoLojista(idParam, lojistaId);
        return this.paraResposta(recompensa);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarRecompensa,
    ): Promise<RespostaRecompensa> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        const dados: {
            nome?: string;
            descricao?: string | null;
            custoPontos?: number;
        } = {};
        if (request.nome !== undefined) {
            dados.nome = this.validarNome(request.nome);
        }
        if (request.descricao !== undefined) {
            dados.descricao = this.validarDescricaoOpcional(request.descricao);
        }
        if (request.custoPontos !== undefined) {
            dados.custoPontos = this.validarCustoPontos(request.custoPontos);
        }
        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }
        const atualizado = await this.repositorioRecompensa.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async desativar(usuarioId: number, idParam: string): Promise<RespostaRecompensa> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        if (!existente.ativa) {
            return this.paraResposta(existente);
        }
        const atualizado = await this.repositorioRecompensa.atualizar(existente.id, {
            ativa: false,
        });
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        await this.repositorioRecompensa.deletar(existente.id);
    }

    async catalogoConsumidor(usuarioId: number): Promise<RespostaCatalogoRecompensa> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );
        const consumidor = await this.repositorioConsumidor.buscar(consumidorId);
        if (!consumidor) {
            throw new ErroAplicacao("Consumidor nao encontrado para o usuario logado", 404);
        }
        const lista = await this.repositorioRecompensa.listarAtivas();
        return {
            pontos: consumidor.pontos,
            nivel: consumidor.nivel,
            recompensas: lista.map((item) => this.paraResposta(item)),
        };
    }

    async resgatar(
        usuarioId: number,
        idParam: string,
        _body: unknown,
    ): Promise<RespostaEfetuarResgate> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );
        const id = this.parseId(idParam);
        const recompensa = await this.repositorioRecompensa.buscar(id);
        if (!recompensa) {
            throw new ErroAplicacao("Recompensa nao encontrada", 404);
        }
        if (!recompensa.ativa) {
            throw new ErroAplicacao("Recompensa nao disponivel", 400);
        }

        const { resgate, consumidor } = await this.repositorioResgate.resgatarComDebito({
            recompensaId: recompensa.id,
            consumidorId,
            custoPontos: recompensa.custoPontos,
            nomeRecompensa: recompensa.nome,
        });

        return {
            resgate: this.paraRespostaResgate(resgate),
            consumidor: this.paraRespostaConsumidor(consumidor),
        };
    }

    async listarResgates(usuarioId: number): Promise<RespostaResgateRecompensa[]> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );
        const lista = await this.repositorioResgate.listarPorConsumidorId(consumidorId);
        return lista.map((item) => this.paraRespostaResgate(item));
    }

    private async obterDoLojista(idParam: string, lojistaId: number): Promise<Recompensa> {
        const id = this.parseId(idParam);
        const recompensa = await this.repositorioRecompensa.buscar(id);
        if (!recompensa || recompensa.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Recompensa nao encontrada", 404);
        }
        return recompensa;
    }

    private paraResposta(item: Recompensa): RespostaRecompensa {
        return {
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            custoPontos: item.custoPontos,
            ativa: item.ativa,
            lojistaId: item.lojistaId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        };
    }

    private paraRespostaResgate(item: ResgateRecompensa): RespostaResgateRecompensa {
        return {
            id: item.id,
            recompensaId: item.recompensaId,
            consumidorId: item.consumidorId,
            custoPontosSnapshot: item.custoPontosSnapshot,
            nomeRecompensaSnapshot: item.nomeRecompensaSnapshot,
            dataCriacao: item.dataCriacao,
        };
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

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome da recompensa e obrigatorio", 400);
        }
        return nome.trim();
    }

    private validarDescricaoOpcional(descricao: unknown): string | null {
        if (descricao === undefined || descricao === null || descricao === "") {
            return null;
        }
        if (typeof descricao !== "string") {
            throw new ErroAplicacao("Descricao da recompensa invalida", 400);
        }
        return descricao.trim() || null;
    }

    private validarCustoPontos(valor: unknown): number {
        if (valor === undefined || valor === null || valor === "") {
            throw new ErroAplicacao("custoPontos e obrigatorio", 400);
        }
        const n = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(n) || n < 1) {
            throw new ErroAplicacao("custoPontos deve ser um inteiro maior que zero", 400);
        }
        return n;
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da recompensa invalido", 400);
        }
        return id;
    }
}
