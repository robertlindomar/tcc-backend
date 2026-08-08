import { PrismaClient } from "../../../generated/prisma/client";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Lojista } from "../model/Lojista";

type RegistroLojista = {
    id: number;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual: number | null;
    status: StatusLojista;
    usuarioId: number;
    associacaoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioLojista {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        nomeFantasia: string;
        razaoSocial: string;
        cnpj: string;
        inscricaoEstadual: number | null;
        status: StatusLojista;
        usuarioId: number;
        associacaoId: number;
    }): Promise<Lojista> {
        try {
            const criado = await this.prisma.lojista.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar lojista", 500);
        }
    }

    async listar(status?: StatusLojista): Promise<Lojista[]> {
        try {
            const lista = await this.prisma.lojista.findMany({
                where: status ? { status } : undefined,
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar lojistas", 500);
        }
    }

    async buscar(id: number): Promise<Lojista | null> {
        try {
            const item = await this.prisma.lojista.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar lojista por ID", 500);
        }
    }

    async buscarPorUsuarioId(usuarioId: number): Promise<Lojista | null> {
        try {
            const item = await this.prisma.lojista.findUnique({
                where: { usuarioId },
            });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar lojista por usuario", 500);
        }
    }

    async buscarPorCnpj(cnpj: string): Promise<Lojista | null> {
        try {
            const item = await this.prisma.lojista.findUnique({ where: { cnpj } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar lojista por CNPJ", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            nomeFantasia: string;
            razaoSocial: string;
            cnpj: string;
            inscricaoEstadual: number | null;
        },
    ): Promise<Lojista> {
        try {
            const atualizado = await this.prisma.lojista.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar lojista", 500);
        }
    }

    async atualizarStatus(id: number, status: StatusLojista): Promise<Lojista> {
        try {
            const atualizado = await this.prisma.lojista.update({
                where: { id },
                data: { status },
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar status do lojista", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.lojista.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar lojista", 500);
        }
    }

    private paraDominio(item: RegistroLojista): Lojista {
        return new Lojista({
            id: item.id,
            nomeFantasia: item.nomeFantasia,
            razaoSocial: item.razaoSocial,
            cnpj: item.cnpj,
            inscricaoEstadual: item.inscricaoEstadual,
            status: item.status,
            usuarioId: item.usuarioId,
            associacaoId: item.associacaoId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
