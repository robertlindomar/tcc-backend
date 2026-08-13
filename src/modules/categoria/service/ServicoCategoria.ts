import { recusarEscritaCatalogoGlobal } from "../../../shared/authz/recusarEscritaCatalogoGlobal";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { DTOAtualizarCategoria } from "../dto/DTOAtualizarCategoria";
import { DTOCriarCategoria } from "../dto/DTOCriarCategoria";
import { RespostaCategoria } from "../dtos/RespostaCategoria";
import { Categoria } from "../model/Categoria";
import { RepositorioCategoria } from "../repository/RepositorioCategoria";

export class ServicoCategoria {
    constructor(private readonly repositorioCategoria: RepositorioCategoria) {}

    async criar(request: DTOCriarCategoria): Promise<RespostaCategoria> {
        recusarEscritaCatalogoGlobal();
        const nome = this.validarNome(request.nome);
        const categoria = new Categoria({
            id: 0,
            nome,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        });
        const criado = await this.repositorioCategoria.criar(categoria);
        return this.paraResposta(criado);
    }

    async listar(): Promise<RespostaCategoria[]> {
        const lista = await this.repositorioCategoria.listar();
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(idParam: string): Promise<RespostaCategoria> {
        const id = this.parseId(idParam);
        const categoria = await this.repositorioCategoria.buscar(id);
        if (!categoria) {
            throw new ErroAplicacao("Categoria nao encontrada", 404);
        }
        return this.paraResposta(categoria);
    }

    async atualizar(
        idParam: string,
        request: DTOAtualizarCategoria,
    ): Promise<RespostaCategoria> {
        recusarEscritaCatalogoGlobal();
        const id = this.parseId(idParam);
        const nome = this.validarNome(request.nome);
        const existente = await this.repositorioCategoria.buscar(id);
        if (!existente) {
            throw new ErroAplicacao("Categoria nao encontrada", 404);
        }
        const atualizado = await this.repositorioCategoria.atualizar(id, nome);
        return this.paraResposta(atualizado);
    }

    async deletar(idParam: string): Promise<void> {
        recusarEscritaCatalogoGlobal();
        const id = this.parseId(idParam);
        const existente = await this.repositorioCategoria.buscar(id);
        if (!existente) {
            throw new ErroAplicacao("Categoria nao encontrada", 404);
        }
        await this.repositorioCategoria.deletar(id);
    }

    private paraResposta(categoria: Categoria): RespostaCategoria {
        return {
            id: categoria.id,
            nome: categoria.nome,
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
