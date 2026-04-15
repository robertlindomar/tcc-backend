import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/AppError";
import { Role } from "../../auth/enum/Role";
import { AtualizarUsuarioRequest } from "../dtos/AtualizarUsuarioRequest";
import { CriarUsuarioRequest } from "../dtos/CriarUsuarioRequest";
import { UsuarioResponse } from "../dtos/UsuarioResponse";
import { Usuario } from "../model/Usuario";
import { UsuarioRepository } from "../repository/UsuarioRepository";

const ROLES_VALIDAS = Object.values(Role);

export class UsuarioService {
    constructor(private readonly usuarioRepository: UsuarioRepository) {}

    async criar(request: CriarUsuarioRequest): Promise<UsuarioResponse> {
        if (!ROLES_VALIDAS.includes(request.role as Role)) {
            throw new AppError("Role invalida");
        }

        const existente = await this.usuarioRepository.buscarPorEmail(request.email);
        if (existente) {
            throw new AppError("Email ja cadastrado");
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

        const criado = await this.usuarioRepository.criar(usuario);
        return this.toResponse(criado);
    }

    async listar(): Promise<UsuarioResponse[]> {
        const lista = await this.usuarioRepository.listar();
        return lista.map((u) => this.toResponse(u));
    }

    async buscar(idParam: string): Promise<UsuarioResponse> {
        const id = this.parseId(idParam);
        const usuario = await this.usuarioRepository.buscar(id);

        if (!usuario) {
            throw new AppError("Usuario nao encontrado", 404);
        }

        return this.toResponse(usuario);
    }

    async atualizar(idParam: string, request: AtualizarUsuarioRequest): Promise<UsuarioResponse> {
        const id = this.parseId(idParam);
        const atualizado = await this.usuarioRepository.atualizar(id, request.nome, request.email);
        return this.toResponse(atualizado);
    }

    async deletar(idParam: string): Promise<void> {
        const id = this.parseId(idParam);
        return this.usuarioRepository.deletar(id);
    }

    private toResponse(usuario: Usuario): UsuarioResponse {
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
            throw new AppError("ID do usuario invalido", 400);
        }

        return id;
    }
}
