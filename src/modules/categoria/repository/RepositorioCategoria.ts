import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Categoria } from "../model/Categoria";

type RegistroCategoria = {
    id: number;
    nome: string;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

function ehViolacaoUnica(erro: unknown): boolean {
    return (
        typeof erro === "object" &&
        erro !== null &&
        "code" in erro &&
        (erro as { code: unknown }).code === "P2002"
    );
}

export class RepositorioCategoria {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: { nome: string; lojistaId: number }): Promise<Categoria> {
        try {
            const criado = await this.prisma.categoria.create({ data: dados });
            return this.paraDominio(criado);
        } catch (erro) {
            if (ehViolacaoUnica(erro)) {
                throw new ErroAplicacao(
                    "Ja existe categoria com este nome nesta loja",
                    409,
                );
            }
            throw new ErroAplicacao("Erro ao criar categoria", 500);
        }
    }

    async listarPorLojistaId(lojistaId: number): Promise<Categoria[]> {
        try {
            const lista = await this.prisma.categoria.findMany({
                where: { lojistaId },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar categorias", 500);
        }
    }

    async buscar(id: number): Promise<Categoria | null> {
        try {
            const item = await this.prisma.categoria.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar categoria por ID", 500);
        }
    }

    async atualizar(id: number, nome: string): Promise<Categoria> {
        try {
            const atualizado = await this.prisma.categoria.update({
                where: { id },
                data: { nome },
            });
            return this.paraDominio(atualizado);
        } catch (erro) {
            if (ehViolacaoUnica(erro)) {
                throw new ErroAplicacao(
                    "Ja existe categoria com este nome nesta loja",
                    409,
                );
            }
            throw new ErroAplicacao("Erro ao atualizar categoria", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.categoria.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar categoria", 500);
        }
    }

    private paraDominio(item: RegistroCategoria): Categoria {
        return new Categoria({
            id: item.id,
            nome: item.nome,
            lojistaId: item.lojistaId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
