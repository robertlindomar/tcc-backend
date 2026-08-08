import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { DTOAtualizarMissao } from "../dto/DTOAtualizarMissao";
import { DTOCriarMissao } from "../dto/DTOCriarMissao";
import { RespostaMissao } from "../dtos/RespostaMissao";
import { Missao } from "../model/Missao";
import { RepositorioMissao } from "../repository/RepositorioMissao";

export class ServicoMissao {
    constructor(
        private readonly repositorioMissao: RepositorioMissao,
        private readonly repositorioLojista: RepositorioLojista,
    ) {}

    async criar(usuarioId: number, request: DTOCriarMissao): Promise<RespostaMissao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );

        const nome = this.validarNome(request.nome);
        const descricao = this.validarDescricaoOpcional(request.descricao);
        const pontoRecompensa = this.validarPontoRecompensa(
            request.pontoRecompensa === undefined ? 0 : request.pontoRecompensa,
        );

        const criado = await this.repositorioMissao.criar({
            nome,
            descricao,
            pontoRecompensa,
            lojistaId,
        });

        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaMissao[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioMissao.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaMissao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const missao = await this.obterDoLojista(idParam, lojistaId);
        return this.paraResposta(missao);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarMissao,
    ): Promise<RespostaMissao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);

        const dados: {
            nome?: string;
            descricao?: string | null;
            pontoRecompensa?: number;
        } = {};

        if (request.nome !== undefined) {
            dados.nome = this.validarNome(request.nome);
        }
        if (request.descricao !== undefined) {
            dados.descricao = this.validarDescricaoOpcional(request.descricao);
        }
        if (request.pontoRecompensa !== undefined) {
            dados.pontoRecompensa = this.validarPontoRecompensa(request.pontoRecompensa);
        }

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        const atualizado = await this.repositorioMissao.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        await this.repositorioMissao.deletar(existente.id);
    }

    private async obterDoLojista(idParam: string, lojistaId: number): Promise<Missao> {
        const id = this.parseId(idParam);
        const missao = await this.repositorioMissao.buscar(id);

        if (!missao || missao.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Missao nao encontrada", 404);
        }

        return missao;
    }

    private paraResposta(missao: Missao): RespostaMissao {
        return {
            id: missao.id,
            nome: missao.nome,
            descricao: missao.descricao,
            pontoRecompensa: missao.pontoRecompensa,
            lojistaId: missao.lojistaId,
            dataCriacao: missao.dataCriacao,
            dataAtualizacao: missao.dataAtualizacao,
        };
    }

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome da missao e obrigatorio", 400);
        }
        return nome.trim();
    }

    private validarDescricaoOpcional(descricao: unknown): string | null {
        if (descricao === undefined || descricao === null || descricao === "") {
            return null;
        }
        if (typeof descricao !== "string") {
            throw new ErroAplicacao("Descricao da missao invalida", 400);
        }
        return descricao.trim() || null;
    }

    private validarPontoRecompensa(valor: unknown): number {
        const n = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(n) || n < 0) {
            throw new ErroAplicacao("pontoRecompensa invalido", 400);
        }
        return n;
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da missao invalido", 400);
        }
        return id;
    }
}
