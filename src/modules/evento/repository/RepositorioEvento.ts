import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Evento } from "../model/Evento";

type RegistroEvento = {
    id: number;
    nome: string;
    descricao: string | null;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioEvento {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        nome: string;
        descricao: string | null;
        lojistaId: number;
    }): Promise<Evento> {
        try {
            const criado = await this.prisma.evento.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar evento", 500);
        }
    }

    async listarPorLojistaId(lojistaId: number): Promise<Evento[]> {
        try {
            const lista = await this.prisma.evento.findMany({
                where: { lojistaId },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar eventos", 500);
        }
    }

    async buscar(id: number): Promise<Evento | null> {
        try {
            const item = await this.prisma.evento.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar evento por ID", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            nome?: string;
            descricao?: string | null;
        },
    ): Promise<Evento> {
        try {
            const atualizado = await this.prisma.evento.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar evento", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.evento.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar evento", 500);
        }
    }

    private paraDominio(item: RegistroEvento): Evento {
        return new Evento({
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            lojistaId: item.lojistaId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
