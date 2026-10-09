import { recusarEscritaCatalogoGlobal } from "../../../shared/authz/recusarEscritaCatalogoGlobal";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { DTOAtualizarSexo } from "../dto/DTOAtualizarSexo";
import { DTOCriarSexo } from "../dto/DTOCriarSexo";
import { RespostaSexo } from "../dtos/RespostaSexo";
import { Sexo } from "../model/Sexo";
import { RepositorioSexo } from "../repository/RepositorioSexo";

export class ServicoSexo {
    constructor(private readonly repositorioSexo: RepositorioSexo) {}

    async criar(request: DTOCriarSexo): Promise<RespostaSexo> {
        recusarEscritaCatalogoGlobal();
        const nome = this.validarNome(request.nome);

        const sexo = new Sexo({
            id: 0,
            nome,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        });

        const criado = await this.repositorioSexo.criar(sexo);
        return this.paraResposta(criado);
    }

    async listar(): Promise<RespostaSexo[]> {
        const lista = await this.repositorioSexo.listar();
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(idParam: string): Promise<RespostaSexo> {
        const id = this.parseId(idParam);
        const sexo = await this.repositorioSexo.buscar(id);

        if (!sexo) {
            throw new ErroAplicacao("Sexo nao encontrado", 404);
        }

        return this.paraResposta(sexo);
    }

    async atualizar(idParam: string, request: DTOAtualizarSexo): Promise<RespostaSexo> {
        recusarEscritaCatalogoGlobal();
        const id = this.parseId(idParam);
        const nome = this.validarNome(request.nome);

        const existente = await this.repositorioSexo.buscar(id);
        if (!existente) {
            throw new ErroAplicacao("Sexo nao encontrado", 404);
        }

        const atualizado = await this.repositorioSexo.atualizar(id, nome);
        return this.paraResposta(atualizado);
    }

    async deletar(idParam: string): Promise<void> {
        recusarEscritaCatalogoGlobal();
        const id = this.parseId(idParam);

        const existente = await this.repositorioSexo.buscar(id);
        if (!existente) {
            throw new ErroAplicacao("Sexo nao encontrado", 404);
        }

        await this.repositorioSexo.deletar(id);
    }

    private paraResposta(sexo: Sexo): RespostaSexo {
        return {
            id: sexo.id,
            nome: sexo.nome,
            dataCriacao: sexo.dataCriacao,
            dataAtualizacao: sexo.dataAtualizacao,
        };
    }

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome do sexo é obrigatório");
        }

        return nome.trim();
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID do sexo invalido", 400);
        }

        return id;
    }
}
