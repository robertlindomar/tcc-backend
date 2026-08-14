import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Recompensa } from "../model/Recompensa";

type RegistroRecompensa = {
    id: number;
    nome: string;
    descricao: string | null;
    custoPontos: number;
    ativa: boolean;
    lojistaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

function ehRestricaoFk(erro: unknown): boolean {
    return (
        typeof erro === "object" &&
        erro !== null &&
        "code" in erro &&
        (erro as { code: unknown }).code === "P2003"
    );
}

export class RepositorioRecompensa {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        nome: string;
        descricao: string | null;
        custoPontos: number;
        lojistaId: number;
        ativa?: boolean;
    }): Promise<Recompensa> {
        try {
            const criado = await this.prisma.recompensa.create({
                data: {
                    nome: dados.nome,
                    descricao: dados.descricao,
                    custoPontos: dados.custoPontos,
                    lojistaId: dados.lojistaId,
                    ativa: dados.ativa ?? true,
                },
            });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar recompensa", 500);
        }
    }

    async listarPorLojistaId(lojistaId: number): Promise<Recompensa[]> {
        try {
            const lista = await this.prisma.recompensa.findMany({
                where: { lojistaId },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar recompensas", 500);
        }
    }

    async listarAtivas(): Promise<Recompensa[]> {
        try {
            const lista = await this.prisma.recompensa.findMany({
                where: { ativa: true },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar recompensas ativas", 500);
        }
    }

    async buscar(id: number): Promise<Recompensa | null> {
        try {
            const item = await this.prisma.recompensa.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar recompensa por ID", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            nome?: string;
            descricao?: string | null;
            custoPontos?: number;
            ativa?: boolean;
        },
    ): Promise<Recompensa> {
        try {
            const atualizado = await this.prisma.recompensa.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar recompensa", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.recompensa.delete({ where: { id } });
        } catch (erro) {
            if (ehRestricaoFk(erro)) {
                throw new ErroAplicacao("Recompensa possui resgates e nao pode ser excluida", 409);
            }
            throw new ErroAplicacao("Erro ao deletar recompensa", 500);
        }
    }

    private paraDominio(item: RegistroRecompensa): Recompensa {
        return new Recompensa({
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            custoPontos: item.custoPontos,
            ativa: item.ativa,
            lojistaId: item.lojistaId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
