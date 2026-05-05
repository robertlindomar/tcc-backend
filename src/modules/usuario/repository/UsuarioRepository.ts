import { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../shared/errors/AppError";
import { Role } from "../../auth/enum/Role";
import { Usuario } from "../model/Usuario";

export class UsuarioRepository {
    private readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async criar(usuario: Usuario): Promise<Usuario> {
        try {
            const criado = await this.prisma.usuario.create({
                data: {
                    nome: usuario.nome,
                    email: usuario.email,
                    senha: usuario.senha,
                    role: usuario.role,
                },
            });

            return new Usuario({
                id: criado.id,
                nome: criado.nome,
                email: criado.email,
                senha: criado.senha,
                role: criado.role as Role,
                ativo: criado.ativo,
                createdAt: criado.createdAt,
                updatedAt: criado.updatedAt,
            });
        } catch {
            throw new AppError("Erro ao criar usuario", 500);
        }
    }

    async listar(): Promise<Usuario[]> {
        try {
            const lista = await this.prisma.usuario.findMany();
            return lista.map(
                (u) =>
                    new Usuario({
                        id: u.id,
                        nome: u.nome,
                        email: u.email,
                        senha: u.senha,
                        role: u.role as Role,
                        ativo: u.ativo,
                        createdAt: u.createdAt,
                        updatedAt: u.updatedAt,
                    }),
            );
        } catch {
            throw new AppError("Erro ao listar usuarios", 500);
        }
    }

    async buscar(id: number): Promise<Usuario | null> {
        try {
            const u = await this.prisma.usuario.findUnique({ where: { id } });

            if (!u) {
                return null;
            }

            return new Usuario({
                id: u.id,
                nome: u.nome,
                email: u.email,
                senha: u.senha,
                role: u.role as Role,
                ativo: u.ativo,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            });
        } catch {
            throw new AppError("Erro ao buscar usuario por ID", 500);
        }
    }

    async buscarPorEmail(email: string): Promise<Usuario | null> {
        try {
            const u = await this.prisma.usuario.findUnique({ where: { email } });

            if (!u) {
                return null;
            }

            return new Usuario({
                id: u.id,
                nome: u.nome,
                email: u.email,
                senha: u.senha,
                role: u.role as Role,
                ativo: u.ativo,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            });
        } catch {
            throw new AppError("Erro ao buscar usuario por email", 500);
        }
    }

    async atualizar(id: number, nome: string, email: string): Promise<Usuario> {
        try {
            const u = await this.prisma.usuario.update({
                where: { id },
                data: { nome, email },
            });

            return new Usuario({
                id: u.id,
                nome: u.nome,
                email: u.email,
                senha: u.senha,
                role: u.role as Role,
                ativo: u.ativo,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            });
        } catch {
            throw new AppError("Erro ao atualizar usuario", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.usuario.delete({ where: { id } });
        } catch {
            throw new AppError("Erro ao deletar usuario", 500);
        }
    }
}
