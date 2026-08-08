import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Campanha } from "../model/Campanha";

type RegistroCampanha = {
    id: number;
    nome: string;
    descricao: string | null;
    qrcode: string | null;
    associacaoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioCampanha {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        nome: string;
        descricao: string | null;
        qrcode: string | null;
        associacaoId: number;
    }): Promise<Campanha> {
        try {
            const criado = await this.prisma.campanha.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar campanha", 500);
        }
    }

    async listarPorAssociacaoId(associacaoId: number): Promise<Campanha[]> {
        try {
            const lista = await this.prisma.campanha.findMany({
                where: { associacaoId },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar campanhas", 500);
        }
    }

    async buscar(id: number): Promise<Campanha | null> {
        try {
            const item = await this.prisma.campanha.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar campanha por ID", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            nome?: string;
            descricao?: string | null;
            qrcode?: string | null;
        },
    ): Promise<Campanha> {
        try {
            const atualizado = await this.prisma.campanha.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar campanha", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.campanha.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar campanha", 500);
        }
    }

    private paraDominio(item: RegistroCampanha): Campanha {
        return new Campanha({
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            qrcode: item.qrcode,
            associacaoId: item.associacaoId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
