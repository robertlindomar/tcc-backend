import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Consumidor } from "../model/Consumidor";

type RegistroConsumidor = {
    id: number;
    cpf: string;
    pontos: number;
    nivel: number;
    sexoId: number | null;
    lojistaId: number | null;
    usuarioId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioConsumidor {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        cpf: string;
        usuarioId: number;
        sexoId: number | null;
        lojistaId: number | null;
    }): Promise<Consumidor> {
        try {
            const criado = await this.prisma.consumidor.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar consumidor", 500);
        }
    }

    async listar(): Promise<Consumidor[]> {
        try {
            const lista = await this.prisma.consumidor.findMany({
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar consumidores", 500);
        }
    }

    async buscar(id: number): Promise<Consumidor | null> {
        try {
            const item = await this.prisma.consumidor.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar consumidor por ID", 500);
        }
    }

    async buscarPorUsuarioId(usuarioId: number): Promise<Consumidor | null> {
        try {
            const item = await this.prisma.consumidor.findUnique({
                where: { usuarioId },
            });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar consumidor por usuario", 500);
        }
    }

    async buscarPorCpf(cpf: string): Promise<Consumidor | null> {
        try {
            const item = await this.prisma.consumidor.findUnique({ where: { cpf } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar consumidor por CPF", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            cpf: string;
            sexoId: number | null;
            lojistaId: number | null;
        },
    ): Promise<Consumidor> {
        try {
            const atualizado = await this.prisma.consumidor.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar consumidor", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.consumidor.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar consumidor", 500);
        }
    }

    private paraDominio(item: RegistroConsumidor): Consumidor {
        return new Consumidor({
            id: item.id,
            cpf: item.cpf,
            pontos: item.pontos,
            nivel: item.nivel,
            sexoId: item.sexoId,
            lojistaId: item.lojistaId,
            usuarioId: item.usuarioId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
