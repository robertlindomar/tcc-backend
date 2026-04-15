import { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../shared/errors/AppError";
import { Rua } from "../model/Rua";

export class RuaRepository {
    private readonly prisma: PrismaClient;
    constructor(prisma: PrismaClient) {
        this.prisma = prisma;   
    }

    async criar(rua: Rua): Promise<Rua> {
        try {
            const novaRua = await this.prisma.rua.create({
                data: { nome: rua.nome },
            });

            return new Rua({
                id: novaRua.id,
                nome: novaRua.nome,
                data_criacao: novaRua.dataCriacao,
                data_atualizacao: novaRua.dataAtualizacao,
            });
        } catch (error) {
            throw new AppError('Erro ao criar rua', 500);
        }
    }

    async listar(): Promise<Rua[]> {
        try {
            const ruas = await this.prisma.rua.findMany();
            return ruas.map(
                (rua) =>
                    new Rua({
                        id: rua.id,
                        nome: rua.nome,
                        data_criacao: rua.dataCriacao,
                        data_atualizacao: rua.dataAtualizacao,
                    }),
            );
        } catch (error) {
            throw new AppError('Erro ao listar ruas', 500);
        }
    }

    async buscar(id: number): Promise<Rua | null> {
        try {
            const rua = await this.prisma.rua.findUnique({ where: { id } });

            if (!rua) {
                return null;
            }

            return new Rua({
                id: rua.id,
                nome: rua.nome,
                data_criacao: rua.dataCriacao,
                data_atualizacao: rua.dataAtualizacao,
            });
        } catch (error) {
            throw new AppError('Erro ao buscar rua por ID', 500);
        }
    }

    async atualizar(id: number, nome: string): Promise<Rua> {
        try {
            const rua = await this.prisma.rua.update({ where: { id }, data: { nome } });
            return new Rua({    
                id: rua.id,
                nome: rua.nome,
                data_criacao: rua.dataCriacao,
                data_atualizacao: rua.dataAtualizacao,
            });
        } catch (error) {
            throw new AppError('Erro ao atualizar rua', 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.rua.delete({ where: { id } });
        } catch (error) {
            throw new AppError('Erro ao deletar rua', 500);
        }
    }
}
