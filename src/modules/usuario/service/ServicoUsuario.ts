import bcrypt from "bcryptjs";
import { garantirProprioId } from "../../../shared/authz/garantirProprioId";
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

        // Cadastro público (web + mobile): não cria Associação (1 associação via seed).
        // LOJISTA e CONSUMIDOR seguem permitidos — o app mobile usa a mesma API.
        if (request.role === Role.ASSOCIACAO) {
            throw new ErroAplicacao(
                "Cadastro de associacao nao permitido pela API publica",
                403,
            );
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
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        });

        const criado = await this.repositorioUsuario.criar(usuario);
        return this.paraResposta(criado);
    }

    async criarViaHttp(): Promise<never> {
        throw new ErroAplicacao("Cadastro publico deve usar POST /auth/cadastro", 403);
    }

    async listar(): Promise<never> {
        throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
    }

    async buscar(idParam: string, usuarioLogadoId: number): Promise<RespostaUsuario> {
        const id = this.parseId(idParam);
        garantirProprioId(id, usuarioLogadoId);

        const usuario = await this.repositorioUsuario.buscar(id);

        if (!usuario) {
            throw new ErroAplicacao("Usuario nao encontrado", 404);
        }

        return this.paraResposta(usuario);
    }

    async atualizar(
        idParam: string,
        usuarioLogadoId: number,
        request: RequisicaoAtualizarUsuario,
    ): Promise<RespostaUsuario> {
        const id = this.parseId(idParam);
        garantirProprioId(id, usuarioLogadoId);

        const atualizado = await this.repositorioUsuario.atualizar(
            id,
            request.nome,
            request.email,
        );
        return this.paraResposta(atualizado);
    }

    async deletar(idParam: string, usuarioLogadoId: number): Promise<void> {
        const id = this.parseId(idParam);
        garantirProprioId(id, usuarioLogadoId);
        return this.repositorioUsuario.deletar(id);
    }

    private paraResposta(usuario: Usuario): RespostaUsuario {
        return {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            ativo: usuario.ativo,
            dataCriacao: usuario.dataCriacao,
            dataAtualizacao: usuario.dataAtualizacao,
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
