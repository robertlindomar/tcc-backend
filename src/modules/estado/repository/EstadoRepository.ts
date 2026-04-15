import { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../shared/errors/AppError";
import { Estado } from "../model/Estado";

export class EstadoRepository {
    private readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async criar(estado: Estado): Promise<Estado> {
        try {
            const criado = await this.prisma.estado.create({
                data: { nome: estado.nome },
            });

            return new Estado({
                id: criado.id,
                nome: criado.nome,
                dataCriacao: criado.dataCriacao,
                dataAtualizacao: criado.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao criar estado", 500);
        }
    }

    async listar(): Promise<Estado[]> {
        try {
            const lista = await this.prisma.estado.findMany();
            return lista.map(
                (e) =>
                    new Estado({
                        id: e.id,
                        nome: e.nome,
                        dataCriacao: e.dataCriacao,
                        dataAtualizacao: e.dataAtualizacao,
                    }),
            );
        } catch {
            throw new AppError("Erro ao listar estados", 500);
        }
    }

    async buscar(id: number): Promise<Estado | null> {
        try {
            const e = await this.prisma.estado.findUnique({ where: { id } });

            if (!e) {
                return null;
            }

            return new Estado({
                id: e.id,
                nome: e.nome,
                dataCriacao: e.dataCriacao,
                dataAtualizacao: e.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao buscar estado por ID", 500);
        }
    }

    async atualizar(id: number, nome: string): Promise<Estado> {
        try {
            const e = await this.prisma.estado.update({ where: { id }, data: { nome } });
            return new Estado({
                id: e.id,
                nome: e.nome,
                dataCriacao: e.dataCriacao,
                dataAtualizacao: e.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao atualizar estado", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.estado.delete({ where: { id } });
        } catch {
            throw new AppError("Erro ao deletar estado", 500);
        }
    }
}
