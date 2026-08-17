import { PrismaClient } from "../../../generated/prisma/client";
import { FrequenciaMissao } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { gerarTokenQrMissao } from "../../../shared/utils/tokenQrMissao";
import { Missao } from "../model/Missao";

type RegistroMissao = {
    id: number;
    nome: string;
    descricao: string | null;
    pontoRecompensa: number;
    frequencia: FrequenciaMissao;
    dataFim: Date | null;
    lojistaId: number;
    tokenQr: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioMissao {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        nome: string;
        descricao: string | null;
        pontoRecompensa: number;
        frequencia: FrequenciaMissao;
        dataFim: Date;
        lojistaId: number;
    }): Promise<Missao> {
        try {
            const criado = await this.prisma.missao.create({
                data: {
                    ...dados,
                    tokenQr: gerarTokenQrMissao(),
                },
            });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar missao", 500);
        }
    }

    async listarPorLojistaId(lojistaId: number): Promise<Missao[]> {
        try {
            const lista = await this.prisma.missao.findMany({
                where: { lojistaId },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar missoes", 500);
        }
    }

    async buscar(id: number): Promise<Missao | null> {
        try {
            const item = await this.prisma.missao.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar missao por ID", 500);
        }
    }

    async buscarPorTokenQr(tokenQr: string): Promise<Missao | null> {
        try {
            const item = await this.prisma.missao.findUnique({ where: { tokenQr } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar missao por token", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            nome?: string;
            descricao?: string | null;
            pontoRecompensa?: number;
            frequencia?: FrequenciaMissao;
            dataFim?: Date;
        },
    ): Promise<Missao> {
        try {
            const atualizado = await this.prisma.missao.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar missao", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.missao.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar missao", 500);
        }
    }

    private paraDominio(item: RegistroMissao): Missao {
        return new Missao({
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            pontoRecompensa: item.pontoRecompensa,
            frequencia: item.frequencia,
            dataFim: item.dataFim,
            lojistaId: item.lojistaId,
            tokenQr: item.tokenQr,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
