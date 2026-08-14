import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { decimalParaNumero } from "../../../shared/utils/decimalParaNumero";
import { Produto } from "../model/Produto";

type RegistroProduto = {
    id: number;
    nome: string;
    valor: { toString(): string } | number;
    categoriaId: number | null;
    lojistaId: number;
    urlImagem: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioProduto {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        nome: string;
        valor: number;
        categoriaId: number | null;
        lojistaId: number;
    }): Promise<Produto> {
        try {
            const criado = await this.prisma.produto.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar produto", 500);
        }
    }

    async listarPorLojistaId(lojistaId: number): Promise<Produto[]> {
        try {
            const lista = await this.prisma.produto.findMany({
                where: { lojistaId },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar produtos", 500);
        }
    }

    async buscar(id: number): Promise<Produto | null> {
        try {
            const item = await this.prisma.produto.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar produto por ID", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            nome?: string;
            valor?: number;
            categoriaId?: number | null;
            urlImagem?: string | null;
        },
    ): Promise<Produto> {
        try {
            const atualizado = await this.prisma.produto.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar produto", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.produto.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar produto", 500);
        }
    }

    private paraDominio(item: RegistroProduto): Produto {
        return new Produto({
            id: item.id,
            nome: item.nome,
            valor: decimalParaNumero(item.valor),
            categoriaId: item.categoriaId,
            lojistaId: item.lojistaId,
            urlImagem: item.urlImagem,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
