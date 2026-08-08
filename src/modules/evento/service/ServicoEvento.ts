import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { DTOAtualizarEvento } from "../dto/DTOAtualizarEvento";
import { DTOCriarEvento } from "../dto/DTOCriarEvento";
import { RespostaEvento } from "../dtos/RespostaEvento";
import { Evento } from "../model/Evento";
import { RepositorioEvento } from "../repository/RepositorioEvento";

export class ServicoEvento {
    constructor(
        private readonly repositorioEvento: RepositorioEvento,
        private readonly repositorioLojista: RepositorioLojista,
    ) {}

    async criar(usuarioId: number, request: DTOCriarEvento): Promise<RespostaEvento> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );

        const nome = this.validarNome(request.nome);
        const descricao = this.validarDescricaoOpcional(request.descricao);

        const criado = await this.repositorioEvento.criar({
            nome,
            descricao,
            lojistaId,
        });

        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaEvento[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioEvento.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaEvento> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const evento = await this.obterDoLojista(idParam, lojistaId);
        return this.paraResposta(evento);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarEvento,
    ): Promise<RespostaEvento> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);

        const dados: {
            nome?: string;
            descricao?: string | null;
        } = {};

        if (request.nome !== undefined) {
            dados.nome = this.validarNome(request.nome);
        }
        if (request.descricao !== undefined) {
            dados.descricao = this.validarDescricaoOpcional(request.descricao);
        }

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        const atualizado = await this.repositorioEvento.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        await this.repositorioEvento.deletar(existente.id);
    }

    private async obterDoLojista(idParam: string, lojistaId: number): Promise<Evento> {
        const id = this.parseId(idParam);
        const evento = await this.repositorioEvento.buscar(id);

        if (!evento || evento.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Evento nao encontrado", 404);
        }

        return evento;
    }

    private paraResposta(evento: Evento): RespostaEvento {
        return {
            id: evento.id,
            nome: evento.nome,
            descricao: evento.descricao,
            lojistaId: evento.lojistaId,
            dataCriacao: evento.dataCriacao,
            dataAtualizacao: evento.dataAtualizacao,
        };
    }

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome do evento e obrigatorio", 400);
        }
        return nome.trim();
    }

    private validarDescricaoOpcional(descricao: unknown): string | null {
        if (descricao === undefined || descricao === null || descricao === "") {
            return null;
        }
        if (typeof descricao !== "string") {
            throw new ErroAplicacao("Descricao do evento invalida", 400);
        }
        return descricao.trim() || null;
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID do evento invalido", 400);
        }
        return id;
    }
}
