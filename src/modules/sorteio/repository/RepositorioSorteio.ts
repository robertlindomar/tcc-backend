import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Sorteio } from "../model/Sorteio";

type RegistroSorteio = {
    id: number;
    qrcode: string | null;
    campanhaId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioSorteio {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        campanhaId: number;
        qrcode: string | null;
    }): Promise<Sorteio> {
        try {
            const criado = await this.prisma.sorteio.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar sorteio", 500);
        }
    }

    async listarPorAssociacaoId(associacaoId: number): Promise<Sorteio[]> {
        try {
            const lista = await this.prisma.sorteio.findMany({
                where: { campanha: { associacaoId } },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar sorteios", 500);
        }
    }

    async buscar(id: number): Promise<Sorteio | null> {
        try {
            const item = await this.prisma.sorteio.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar sorteio por ID", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            campanhaId?: number;
            qrcode?: string | null;
        },
    ): Promise<Sorteio> {
        try {
            const atualizado = await this.prisma.sorteio.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar sorteio", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.sorteio.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar sorteio", 500);
        }
    }

    private paraDominio(item: RegistroSorteio): Sorteio {
        return new Sorteio({
            id: item.id,
            qrcode: item.qrcode,
            campanhaId: item.campanhaId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
