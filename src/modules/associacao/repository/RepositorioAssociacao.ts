import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Associacao } from "../model/Associacao";

type RegistroAssociacao = {
    id: number;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual: number | null;
    usuarioId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioAssociacao {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        nomeFantasia: string;
        razaoSocial: string;
        cnpj: string;
        inscricaoEstadual: number | null;
        usuarioId: number;
    }): Promise<Associacao> {
        try {
            const criado = await this.prisma.associacao.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar associacao", 500);
        }
    }

    async listar(): Promise<Associacao[]> {
        try {
            const lista = await this.prisma.associacao.findMany({
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar associacoes", 500);
        }
    }

    async buscar(id: number): Promise<Associacao | null> {
        try {
            const item = await this.prisma.associacao.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar associacao por ID", 500);
        }
    }

    async buscarPorUsuarioId(usuarioId: number): Promise<Associacao | null> {
        try {
            const item = await this.prisma.associacao.findUnique({
                where: { usuarioId },
            });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar associacao por usuario", 500);
        }
    }

    async buscarPorCnpj(cnpj: string): Promise<Associacao | null> {
        try {
            const item = await this.prisma.associacao.findUnique({ where: { cnpj } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar associacao por CNPJ", 500);
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
    ): Promise<Associacao> {
        try {
            const atualizado = await this.prisma.associacao.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar associacao", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.associacao.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar associacao", 500);
        }
    }

    private paraDominio(item: RegistroAssociacao): Associacao {
        return new Associacao({
            id: item.id,
            nomeFantasia: item.nomeFantasia,
            razaoSocial: item.razaoSocial,
            cnpj: item.cnpj,
            inscricaoEstadual: item.inscricaoEstadual,
            usuarioId: item.usuarioId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
