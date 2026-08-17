import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import {
    calcularDataFimPromocao,
    calcularStatusVigenciaPromocao,
} from "../../../shared/utils/calcularStatusVigenciaPromocao";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioProduto } from "../../produto/repository/RepositorioProduto";
import { DTOAtualizarPromocao } from "../dto/DTOAtualizarPromocao";
import { DTOCriarPromocao } from "../dto/DTOCriarPromocao";
import { RespostaPromocao } from "../dtos/RespostaPromocao";
import { Promocao } from "../model/Promocao";
import { RepositorioPromocao } from "../repository/RepositorioPromocao";

export class ServicoPromocao {
    constructor(
        private readonly repositorioPromocao: RepositorioPromocao,
        private readonly repositorioProduto: RepositorioProduto,
        private readonly repositorioLojista: RepositorioLojista,
    ) {}

    async criar(usuarioId: number, request: DTOCriarPromocao): Promise<RespostaPromocao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );

        const produtoId = await this.validarProdutoDoLojista(request.produtoId, lojistaId);
        const preco = this.validarPreco(request.preco);
        const descricao = this.validarDescricaoOpcional(request.descricao);
        const duracaoDias = this.validarDuracaoDias(request.duracaoDias);
        const dataInicio = new Date();
        const dataFim = calcularDataFimPromocao(dataInicio, duracaoDias);

        const criado = await this.repositorioPromocao.criar({
            descricao,
            preco,
            produtoId,
            ativa: true,
            dataInicio,
            dataFim,
        });

        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaPromocao[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioPromocao.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaPromocao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const promocao = await this.obterDoLojista(idParam, lojistaId);
        return this.paraResposta(promocao);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarPromocao,
    ): Promise<RespostaPromocao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);

        const dados: {
            descricao?: string | null;
            preco?: number;
            produtoId?: number;
            dataInicio?: Date;
            dataFim?: Date;
        } = {};

        if (request.descricao !== undefined) {
            dados.descricao = this.validarDescricaoOpcional(request.descricao);
        }
        if (request.preco !== undefined) {
            dados.preco = this.validarPreco(request.preco);
        }
        if (request.produtoId !== undefined) {
            dados.produtoId = await this.validarProdutoDoLojista(
                request.produtoId,
                lojistaId,
            );
        }
        if (request.duracaoDias !== undefined) {
            const duracaoDias = this.validarDuracaoDias(request.duracaoDias);
            dados.dataInicio = new Date();
            dados.dataFim = calcularDataFimPromocao(dados.dataInicio, duracaoDias);
        }

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        const atualizado = await this.repositorioPromocao.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async desativar(usuarioId: number, idParam: string): Promise<RespostaPromocao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        if (!existente.ativa) {
            return this.paraResposta(existente);
        }
        const atualizado = await this.repositorioPromocao.atualizar(existente.id, {
            ativa: false,
        });
        return this.paraResposta(atualizado);
    }

    async reativar(usuarioId: number, idParam: string): Promise<RespostaPromocao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        if (existente.ativa) {
            return this.paraResposta(existente);
        }
        const atualizado = await this.repositorioPromocao.atualizar(existente.id, {
            ativa: true,
        });
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        await this.repositorioPromocao.deletar(existente.id);
    }

    private async obterDoLojista(idParam: string, lojistaId: number): Promise<Promocao> {
        const id = this.parseId(idParam);
        const promocao = await this.repositorioPromocao.buscar(id);

        if (!promocao) {
            throw new ErroAplicacao("Promocao nao encontrada", 404);
        }

        const produto = await this.repositorioProduto.buscar(promocao.produtoId);
        if (!produto || produto.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Promocao nao encontrada", 404);
        }

        return promocao;
    }

    private async validarProdutoDoLojista(
        produtoIdRaw: unknown,
        lojistaId: number,
    ): Promise<number> {
        const produtoId =
            typeof produtoIdRaw === "number" ? produtoIdRaw : Number(produtoIdRaw);
        if (!Number.isInteger(produtoId) || produtoId <= 0) {
            throw new ErroAplicacao("produtoId invalido", 400);
        }

        const produto = await this.repositorioProduto.buscar(produtoId);
        if (!produto || produto.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Produto nao encontrado para este lojista", 404);
        }

        return produtoId;
    }

    private paraResposta(promocao: Promocao): RespostaPromocao {
        return {
            id: promocao.id,
            descricao: promocao.descricao,
            preco: promocao.preco,
            produtoId: promocao.produtoId,
            ativa: promocao.ativa,
            dataInicio: promocao.dataInicio,
            dataFim: promocao.dataFim,
            statusVigencia: calcularStatusVigenciaPromocao({
                ativa: promocao.ativa,
                dataInicio: promocao.dataInicio,
                dataFim: promocao.dataFim,
            }),
            dataCriacao: promocao.dataCriacao,
            dataAtualizacao: promocao.dataAtualizacao,
        };
    }

    private validarPreco(preco: unknown): number {
        const n = typeof preco === "number" ? preco : Number(preco);
        if (!Number.isFinite(n) || n < 0) {
            throw new ErroAplicacao("Preco da promocao invalido", 400);
        }
        return Math.round(n * 100) / 100;
    }

    private validarDuracaoDias(valor: unknown): number {
        if (valor === undefined || valor === null || valor === "") {
            throw new ErroAplicacao("Duracao em dias e obrigatoria", 400);
        }
        const n = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(n) || n <= 0) {
            throw new ErroAplicacao("Duracao em dias deve ser um inteiro maior que zero", 400);
        }
        return n;
    }

    private validarDescricaoOpcional(descricao: unknown): string | null {
        if (descricao === undefined || descricao === null || descricao === "") {
            return null;
        }
        if (typeof descricao !== "string") {
            throw new ErroAplicacao("Descricao da promocao invalida", 400);
        }
        return descricao.trim() || null;
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da promocao invalido", 400);
        }
        return id;
    }
}
