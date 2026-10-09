import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Sexo } from "../model/Sexo";

export class RepositorioSexo {
    private readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async criar(sexo: Sexo): Promise<Sexo> {
        try {
            const criado = await this.prisma.sexo.create({
                data: {
                    nome: sexo.nome,
                },
            });

            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar sexo", 500);
        }
    }

    async listar(): Promise<Sexo[]> {
        try {
            const lista = await this.prisma.sexo.findMany({
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar sexos", 500);
        }
    }

    async buscar(id: number): Promise<Sexo | null> {
        try {
            const item = await this.prisma.sexo.findUnique({ where: { id } });

            if (!item) {
                return null;
            }

            return this.paraDominio(item);
        } catch {
            throw new ErroAplicacao("Erro ao buscar sexo por ID", 500);
        }
    }

    async atualizar(id: number, nome: string): Promise<Sexo> {
        try {
            const atualizado = await this.prisma.sexo.update({
                where: { id },
                data: { nome },
            });

            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar sexo", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.sexo.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar sexo", 500);
        }
    }

    private paraDominio(item: {
        id: number;
        nome: string;
        dataCriacao: Date;
        dataAtualizacao: Date;
    }): Sexo {
        return new Sexo({
            id: item.id,
            nome: item.nome,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
