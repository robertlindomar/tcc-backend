import { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../shared/errors/AppError";
import { Cidade } from "../model/Cidade";

export class CidadeRepository {
    private readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async criar(cidade: Cidade): Promise<Cidade> {
        try {
            const criado = await this.prisma.cidade.create({
                data: { nome: cidade.nome },
            });

            return new Cidade({
                id: criado.id,
                nome: criado.nome,
                dataCriacao: criado.dataCriacao,
                dataAtualizacao: criado.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao criar cidade", 500);
        }
    }

    async listar(): Promise<Cidade[]> {
        try {
            const lista = await this.prisma.cidade.findMany();
            return lista.map(
                (c) =>
                    new Cidade({
                        id: c.id,
                        nome: c.nome,
                        dataCriacao: c.dataCriacao,
                        dataAtualizacao: c.dataAtualizacao,
                    }),
            );
        } catch {
            throw new AppError("Erro ao listar cidades", 500);
        }
    }

    async buscar(id: number): Promise<Cidade | null> {
        try {
            const c = await this.prisma.cidade.findUnique({ where: { id } });

            if (!c) {
                return null;
            }

            return new Cidade({
                id: c.id,
                nome: c.nome,
                dataCriacao: c.dataCriacao,
                dataAtualizacao: c.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao buscar cidade por ID", 500);
        }
    }

    async atualizar(id: number, nome: string): Promise<Cidade> {
        try {
            const c = await this.prisma.cidade.update({ where: { id }, data: { nome } });
            return new Cidade({
                id: c.id,
                nome: c.nome,
                dataCriacao: c.dataCriacao,
                dataAtualizacao: c.dataAtualizacao,
            });
        } catch {
            throw new AppError("Erro ao atualizar cidade", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.cidade.delete({ where: { id } });
        } catch {
            throw new AppError("Erro ao deletar cidade", 500);
        }
    }
}
