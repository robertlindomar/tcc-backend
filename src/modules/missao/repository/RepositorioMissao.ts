import { PrismaClient } from "../../../generated/prisma/client";
import { FrequenciaMissao } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { gerarTokenQrMissao } from "../../../shared/utils/tokenQrMissao";
import {
    DESCRICAO_MISSAO_VISITA_LOJA,
    FREQUENCIA_MISSAO_VISITA_LOJA,
    NOME_MISSAO_VISITA_LOJA,
    PONTOS_MISSAO_VISITA_LOJA,
} from "../constantes/missaoSistema";
import { Missao } from "../model/Missao";

type RegistroMissao = {
    id: number;
    nome: string;
    descricao: string | null;
    pontoRecompensa: number;
    frequencia: FrequenciaMissao;
    dataFim: Date | null;
    sistema: boolean;
    lojistaId: number;
    tokenQr: string;
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
                    sistema: false,
                    tokenQr: gerarTokenQrMissao(),
                },
            });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar missao", 500);
        }
    }

    async garantirSistemaVisitarLoja(lojistaId: number): Promise<Missao> {
        const existente = await this.buscarSistemaPorLojistaId(lojistaId);
        if (existente) {
            return existente;
        }

        try {
            const criado = await this.prisma.missao.create({
                data: {
                    nome: NOME_MISSAO_VISITA_LOJA,
                    descricao: DESCRICAO_MISSAO_VISITA_LOJA,
                    pontoRecompensa: PONTOS_MISSAO_VISITA_LOJA,
                    frequencia: FREQUENCIA_MISSAO_VISITA_LOJA,
                    dataFim: null,
                    sistema: true,
                    lojistaId,
                    tokenQr: gerarTokenQrMissao(),
                },
            });
            return this.paraDominio(criado);
        } catch (erro) {
            if (ehViolacaoUnica(erro)) {
                const corrida = await this.buscarSistemaPorLojistaId(lojistaId);
                if (corrida) {
                    return corrida;
                }
            }
            throw new ErroAplicacao("Erro ao garantir missao de sistema", 500);
        }
    }

    async listarPorLojistaId(lojistaId: number): Promise<Missao[]> {
        try {
            const lista = await this.prisma.missao.findMany({
                where: { lojistaId },
                orderBy: [{ sistema: "desc" }, { id: "asc" }],
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

    async buscarSistemaPorLojistaId(lojistaId: number): Promise<Missao | null> {
        try {
            const item = await this.prisma.missao.findFirst({
                where: { lojistaId, sistema: true },
            });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar missao de sistema", 500);
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
            sistema: item.sistema,
            lojistaId: item.lojistaId,
            tokenQr: item.tokenQr,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
