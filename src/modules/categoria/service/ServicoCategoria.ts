import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { DTOAtualizarCategoria } from "../dto/DTOAtualizarCategoria";
import { DTOCriarCategoria } from "../dto/DTOCriarCategoria";
import { RespostaCategoria } from "../dtos/RespostaCategoria";
import { Categoria } from "../model/Categoria";
import { RepositorioCategoria } from "../repository/RepositorioCategoria";

export class ServicoCategoria {
    constructor(
        private readonly repositorioCategoria: RepositorioCategoria,
        private readonly repositorioLojista: RepositorioLojista,
    ) {}

    async criar(usuarioId: number, request: DTOCriarCategoria): Promise<RespostaCategoria> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );

        const nome = this.validarNome(request.nome);
        const criado = await this.repositorioCategoria.criar({ nome, lojistaId });
        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaCategoria[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioCategoria.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaCategoria> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const categoria = await this.obterDoLojista(idParam, lojistaId);
        return this.paraResposta(categoria);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarCategoria,
    ): Promise<RespostaCategoria> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        const nome = this.validarNome(request.nome);
        const atualizado = await this.repositorioCategoria.atualizar(existente.id, nome);
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        await this.repositorioCategoria.deletar(existente.id);
    }

    private async obterDoLojista(idParam: string, lojistaId: number): Promise<Categoria> {
        const id = this.parseId(idParam);
        const categoria = await this.repositorioCategoria.buscar(id);

        if (!categoria || categoria.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Categoria nao encontrada", 404);
        }

        return categoria;
    }

    private paraResposta(categoria: Categoria): RespostaCategoria {
        return {
            id: categoria.id,
            nome: categoria.nome,
            lojistaId: categoria.lojistaId,
            dataCriacao: categoria.dataCriacao,
            dataAtualizacao: categoria.dataAtualizacao,
        };
    }

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome da categoria e obrigatorio", 400);
        }
        return nome.trim();
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da categoria invalido", 400);
        }
        return id;
    }
}
