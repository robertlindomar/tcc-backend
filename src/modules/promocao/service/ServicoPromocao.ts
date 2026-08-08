import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
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

        const criado = await this.repositorioPromocao.criar({
            descricao,
            preco,
            produtoId,
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

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        const atualizado = await this.repositorioPromocao.atualizar(existente.id, dados);
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
