import bcrypt from "bcryptjs";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { RequisicaoAtualizarUsuario } from "../dtos/RequisicaoAtualizarUsuario";
import { RequisicaoCriarUsuario } from "../dtos/RequisicaoCriarUsuario";
import { RespostaUsuario } from "../dtos/RespostaUsuario";
import { Usuario } from "../model/Usuario";
import { RepositorioUsuario } from "../repository/RepositorioUsuario";

const ROLES_VALIDAS = Object.values(Role);

export class ServicoUsuario {
    constructor(private readonly repositorioUsuario: RepositorioUsuario) {}

    async criar(request: RequisicaoCriarUsuario): Promise<RespostaUsuario> {
        if (!ROLES_VALIDAS.includes(request.role as Role)) {
            throw new ErroAplicacao("Role invalida");
        }

        const existente = await this.repositorioUsuario.buscarPorEmail(request.email);
        if (existente) {
            throw new ErroAplicacao("Email ja cadastrado");
        }

        const senhaHash = await bcrypt.hash(request.senha, 10);

        const usuario = new Usuario({
            id: 0,
            nome: request.nome,
            email: request.email,
            senha: senhaHash,
            role: request.role as Role,
            ativo: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const criado = await this.repositorioUsuario.criar(usuario);
        return this.paraResposta(criado);
    }

    async listar(): Promise<RespostaUsuario[]> {
        const lista = await this.repositorioUsuario.listar();
        return lista.map((u) => this.paraResposta(u));
    }

    async buscar(idParam: string): Promise<RespostaUsuario> {
        const id = this.parseId(idParam);
        const usuario = await this.repositorioUsuario.buscar(id);

        if (!usuario) {
            throw new ErroAplicacao("Usuario nao encontrado", 404);
        }

        return this.paraResposta(usuario);
    }

    async atualizar(
        idParam: string,
        request: RequisicaoAtualizarUsuario,
    ): Promise<RespostaUsuario> {
        const id = this.parseId(idParam);
        const atualizado = await this.repositorioUsuario.atualizar(
            id,
            request.nome,
            request.email,
        );
        return this.paraResposta(atualizado);
    }

    async deletar(idParam: string): Promise<void> {
        const id = this.parseId(idParam);
        return this.repositorioUsuario.deletar(id);
    }

    private paraResposta(usuario: Usuario): RespostaUsuario {
        return {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            ativo: usuario.ativo,
            createdAt: usuario.createdAt,
            updatedAt: usuario.updatedAt,
        };
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID do usuario invalido", 400);
        }

        return id;
    }
}
