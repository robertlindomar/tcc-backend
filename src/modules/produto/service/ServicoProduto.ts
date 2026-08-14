import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ServicoUploadImagem } from "../../../shared/upload/ServicoUploadImagem";
import { RepositorioCategoria } from "../../categoria/repository/RepositorioCategoria";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { DTOAtualizarProduto } from "../dto/DTOAtualizarProduto";
import { DTOCriarProduto } from "../dto/DTOCriarProduto";
import { RespostaProduto } from "../dtos/RespostaProduto";
import { Produto } from "../model/Produto";
import { RepositorioProduto } from "../repository/RepositorioProduto";

export class ServicoProduto {
    constructor(
        private readonly repositorioProduto: RepositorioProduto,
        private readonly repositorioLojista: RepositorioLojista,
        private readonly repositorioCategoria: RepositorioCategoria,
        private readonly servicoUploadImagem: ServicoUploadImagem,
    ) {}

    async criar(usuarioId: number, request: DTOCriarProduto): Promise<RespostaProduto> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );

        const nome = this.validarNome(request.nome);
        const valor = this.validarValor(request.valor);
        const categoriaId = await this.validarCategoriaIdOpcional(
            request.categoriaId,
            lojistaId,
        );

        const criado = await this.repositorioProduto.criar({
            nome,
            valor,
            categoriaId,
            lojistaId,
        });

        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaProduto[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioProduto.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaProduto> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const produto = await this.obterDoLojista(idParam, lojistaId);
        return this.paraResposta(produto);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarProduto,
    ): Promise<RespostaProduto> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);

        const dados: {
            nome?: string;
            valor?: number;
            categoriaId?: number | null;
        } = {};

        if (request.nome !== undefined) {
            dados.nome = this.validarNome(request.nome);
        }
        if (request.valor !== undefined) {
            dados.valor = this.validarValor(request.valor);
        }
        if (request.categoriaId !== undefined) {
            dados.categoriaId = await this.validarCategoriaIdOpcional(
                request.categoriaId,
                lojistaId,
            );
        }

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        const atualizado = await this.repositorioProduto.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        await this.repositorioProduto.deletar(existente.id);
        await this.servicoUploadImagem.remover(existente.urlImagem);
    }

    async definirImagem(
        usuarioId: number,
        idParam: string,
        buffer: Buffer,
    ): Promise<RespostaProduto> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        const urlImagem = await this.servicoUploadImagem.gravar("produtos", buffer);
        const atualizado = await this.repositorioProduto.atualizar(existente.id, {
            urlImagem,
        });
        await this.servicoUploadImagem.remover(existente.urlImagem);
        return this.paraResposta(atualizado);
    }

    private async obterDoLojista(idParam: string, lojistaId: number): Promise<Produto> {
        const id = this.parseId(idParam);
        const produto = await this.repositorioProduto.buscar(id);

        if (!produto || produto.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Produto nao encontrado", 404);
        }

        return produto;
    }

    private paraResposta(produto: Produto): RespostaProduto {
        return {
            id: produto.id,
            nome: produto.nome,
            valor: produto.valor,
            categoriaId: produto.categoriaId,
            lojistaId: produto.lojistaId,
            urlImagem: produto.urlImagem,
            dataCriacao: produto.dataCriacao,
            dataAtualizacao: produto.dataAtualizacao,
        };
    }

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome do produto e obrigatorio", 400);
        }
        return nome.trim();
    }

    private validarValor(valor: unknown): number {
        const n = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isFinite(n) || n < 0) {
            throw new ErroAplicacao("Valor do produto invalido", 400);
        }
        return Math.round(n * 100) / 100;
    }

    private async validarCategoriaIdOpcional(
        valor: unknown,
        lojistaId: number,
    ): Promise<number | null> {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }
        const id = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("categoriaId invalido", 400);
        }
        const categoria = await this.repositorioCategoria.buscar(id);
        if (!categoria || categoria.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Categoria nao encontrada", 404);
        }
        return id;
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID do produto invalido", 400);
        }
        return id;
    }
}
