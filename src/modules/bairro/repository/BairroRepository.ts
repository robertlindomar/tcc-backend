import { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../shared/errors/AppError";
import { Bairro } from "../model/Bairro";

export class BairroRepository {
    private readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async criar(bairro: Bairro): Promise<Bairro> {
        try {
            const criado = await this.prisma.bairro.create({
                data: { nome: bairro.nome },
            });

            return new Bairro({
                id: criado.id,
                nome: criado.nome,
                dataCriacao: criado.dataCriacao,
                dataAtualizacao: criado.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao criar bairro", 500);
        }
    }

    async listar(): Promise<Bairro[]> {
        try {
            const lista = await this.prisma.bairro.findMany();
            return lista.map(
                (b) =>
                    new Bairro({
                        id: b.id,
                        nome: b.nome,
                        dataCriacao: b.dataCriacao,
                        dataAtualizacao: b.dataAtualizacao,
                    }),
            );
        } catch {
            throw new AppError("Erro ao listar bairros", 500);
        }
    }

    async buscar(id: number): Promise<Bairro | null> {
        try {
            const b = await this.prisma.bairro.findUnique({ where: { id } });

            if (!b) {
                return null;
            }

            return new Bairro({
                id: b.id,
                nome: b.nome,
                dataCriacao: b.dataCriacao,
                dataAtualizacao: b.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao buscar bairro por ID", 500);
        }
    }

    async atualizar(id: number, nome: string): Promise<Bairro> {
        try {
            const b = await this.prisma.bairro.update({ where: { id }, data: { nome } });
            return new Bairro({
                id: b.id,
                nome: b.nome,
                dataCriacao: b.dataCriacao,
                dataAtualizacao: b.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao atualizar bairro", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.bairro.delete({ where: { id } });
        } catch {
            throw new AppError("Erro ao deletar bairro", 500);
        }
    }
}
