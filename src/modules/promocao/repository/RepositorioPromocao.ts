import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { decimalParaNumero } from "../../../shared/utils/decimalParaNumero";
import { Promocao } from "../model/Promocao";

type RegistroPromocao = {
    id: number;
    descricao: string | null;
    preco: { toString(): string } | number;
    ativa: boolean;
    dataInicio: Date;
    dataFim: Date;
    produtoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioPromocao {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        descricao: string | null;
        preco: number;
        produtoId: number;
        ativa: boolean;
        dataInicio: Date;
        dataFim: Date;
    }): Promise<Promocao> {
        try {
            const criado = await this.prisma.promocao.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar promocao", 500);
        }
    }

    async listarPorLojistaId(lojistaId: number): Promise<Promocao[]> {
        try {
            const lista = await this.prisma.promocao.findMany({
                where: { produto: { lojistaId } },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar promocoes", 500);
        }
    }

    async listarCatalogoPorLojistaId(lojistaId: number): Promise<
        Array<{ promocao: Promocao; produtoNome: string; produtoValor: number }>
    > {
        try {
            const lista = await this.prisma.promocao.findMany({
                where: { produto: { lojistaId } },
                include: { produto: { select: { nome: true, valor: true } } },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => ({
                promocao: this.paraDominio(item),
                produtoNome: item.produto.nome,
                produtoValor: decimalParaNumero(item.produto.valor),
            }));
        } catch {
            throw new ErroAplicacao("Erro ao listar catalogo de promocoes", 500);
        }
    }

    async buscar(id: number): Promise<Promocao | null> {
        try {
            const item = await this.prisma.promocao.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar promocao por ID", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            descricao?: string | null;
            preco?: number;
            produtoId?: number;
            ativa?: boolean;
            dataInicio?: Date;
            dataFim?: Date;
        },
    ): Promise<Promocao> {
        try {
            const atualizado = await this.prisma.promocao.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar promocao", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.promocao.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar promocao", 500);
        }
    }

    private paraDominio(item: RegistroPromocao): Promocao {
        return new Promocao({
            id: item.id,
            descricao: item.descricao,
            preco: decimalParaNumero(item.preco),
            ativa: item.ativa,
            dataInicio: item.dataInicio,
            dataFim: item.dataFim,
            produtoId: item.produtoId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
