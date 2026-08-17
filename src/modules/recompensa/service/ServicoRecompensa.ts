import { resolverConsumidorLogado } from "../../../shared/authz/resolverConsumidorLogado";
import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { civilNoFuso } from "../../../shared/tempo/fusoNegocio";
import { interpretarDataFim } from "../../../shared/tempo/interpretarDataFim";
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
import { calcularSituacaoRecompensa } from "../utils/calcularSituacaoRecompensa";

function dataCivilIso(dataFim: Date | null): string | null {
    if (!dataFim) {
        return null;
    }
    const civil = civilNoFuso(dataFim);
    return `${civil.ano}-${String(civil.mes).padStart(2, "0")}-${String(civil.dia).padStart(2, "0")}`;
}

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
            estoque: this.validarEstoque(request.estoque),
            dataFim: this.validarDataFimOpcional(request.dataFim),
            lojistaId,
        });
        return this.paraResposta(criado);
    }

    async listar(
        usuarioId: number,
        agora: Date = new Date(),
    ): Promise<RespostaRecompensa[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioRecompensa.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraResposta(item, agora));
    }

    async buscar(
        usuarioId: number,
        idParam: string,
        agora: Date = new Date(),
    ): Promise<RespostaRecompensa> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const recompensa = await this.obterDoLojista(idParam, lojistaId);
        return this.paraResposta(recompensa, agora);
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
            estoque?: number | null;
            dataFim?: Date | null;
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
        if (request.estoque !== undefined) {
            dados.estoque = this.validarEstoque(request.estoque);
        }
        if (request.dataFim !== undefined) {
            dados.dataFim = this.validarDataFimOpcional(request.dataFim);
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

    async catalogoConsumidor(
        usuarioId: number,
        agora: Date = new Date(),
    ): Promise<RespostaCatalogoRecompensa> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );
        const consumidor = await this.repositorioConsumidor.buscar(consumidorId);
        if (!consumidor) {
            throw new ErroAplicacao("Consumidor nao encontrado para o usuario logado", 404);
        }
        const lista = await this.repositorioRecompensa.listarCatalogoAprovado();
        return {
            pontos: consumidor.pontos,
            nivel: consumidor.nivel,
            recompensas: lista.map((item) => this.paraResposta(item, agora)),
        };
    }

    async resgatar(
        usuarioId: number,
        idParam: string,
        _body: unknown,
        agora: Date = new Date(),
    ): Promise<RespostaEfetuarResgate> {
        const { consumidorId } = await resolverConsumidorLogado(
            this.repositorioConsumidor,
            usuarioId,
        );
        const id = this.parseId(idParam, "recompensa");
        const { resgate, consumidor } = await this.repositorioResgate.resgatarComDebito({
            recompensaId: id,
            consumidorId,
            agora,
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

    async listarResgatesLoja(usuarioId: number): Promise<RespostaResgateRecompensa[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioResgate.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraRespostaResgate(item));
    }

    async confirmarEntrega(
        usuarioId: number,
        idParam: string,
        agora: Date = new Date(),
    ): Promise<RespostaResgateRecompensa> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const id = this.parseId(idParam, "resgate");
        const resgate = await this.repositorioResgate.confirmarEntrega({
            resgateId: id,
            lojistaId,
            agora,
        });
        return this.paraRespostaResgate(resgate);
    }

    private async obterDoLojista(idParam: string, lojistaId: number): Promise<Recompensa> {
        const id = this.parseId(idParam, "recompensa");
        const recompensa = await this.repositorioRecompensa.buscar(id);
        if (!recompensa || recompensa.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Recompensa nao encontrada", 404);
        }
        return recompensa;
    }

    private paraResposta(item: Recompensa, agora: Date = new Date()): RespostaRecompensa {
        const resposta: RespostaRecompensa = {
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            custoPontos: item.custoPontos,
            ativa: item.ativa,
            estoque: item.estoque,
            dataFim: item.dataFim,
            dataFimCivil: dataCivilIso(item.dataFim),
            situacao: calcularSituacaoRecompensa(item, agora),
            lojistaId: item.lojistaId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        };
        if (item.nomeLoja) {
            resposta.nomeLoja = item.nomeLoja;
        }
        return resposta;
    }

    private paraRespostaResgate(item: ResgateRecompensa): RespostaResgateRecompensa {
        const resposta: RespostaResgateRecompensa = {
            id: item.id,
            recompensaId: item.recompensaId,
            consumidorId: item.consumidorId,
            custoPontosSnapshot: item.custoPontosSnapshot,
            nomeRecompensaSnapshot: item.nomeRecompensaSnapshot,
            status: item.status,
            dataEntrega: item.dataEntrega,
            dataCriacao: item.dataCriacao,
        };
        if (item.nomeConsumidor) {
            resposta.nomeConsumidor = item.nomeConsumidor;
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

    private validarEstoque(valor: unknown): number | null {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }
        const n = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(n) || n < 0) {
            throw new ErroAplicacao("estoque deve ser um inteiro maior ou igual a zero", 400);
        }
        return n;
    }

    private validarDataFimOpcional(valor: unknown): Date | null {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }
        try {
            return interpretarDataFim(valor);
        } catch {
            throw new ErroAplicacao("dataFim invalida", 400);
        }
    }

    private parseId(idParam: string, recurso: "recompensa" | "resgate"): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao(
                recurso === "resgate" ? "ID do resgate invalido" : "ID da recompensa invalido",
                400,
            );
        }
        return id;
    }
}
