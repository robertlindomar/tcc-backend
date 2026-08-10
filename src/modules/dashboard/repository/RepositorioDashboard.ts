import { StatusLojista } from "../../../generated/prisma/enums";
import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { TipoAtividadeDashboard } from "../dtos/ResumoDashboard";

export type CandidatoAtividade = {
    tipo: TipoAtividadeDashboard;
    entidadeId: number;
    titulo: string;
    ocorridoEm: Date;
};

const LIMITE_CANDIDATOS = 10;

export class RepositorioDashboard {
    constructor(private readonly prisma: PrismaClient) {}

    async contarLojasAguardandoAprovacao(associacaoId: number): Promise<number> {
        try {
            return await this.prisma.lojista.count({
                where: { associacaoId, status: StatusLojista.PENDENTE },
            });
        } catch {
            throw new ErroAplicacao("Erro ao contar lojas pendentes", 500);
        }
    }

    async contarLojasParticipantes(associacaoId: number): Promise<number> {
        try {
            return await this.prisma.lojista.count({
                where: { associacaoId, status: StatusLojista.APROVADO },
            });
        } catch {
            throw new ErroAplicacao("Erro ao contar lojas participantes", 500);
        }
    }

    async contarCampanhasCadastradas(associacaoId: number): Promise<number> {
        try {
            return await this.prisma.campanha.count({
                where: { associacaoId },
            });
        } catch {
            throw new ErroAplicacao("Erro ao contar campanhas", 500);
        }
    }

    /** Contagem via relação com campanhas da associação — nunca global. */
    async contarSorteiosCadastrados(associacaoId: number): Promise<number> {
        try {
            return await this.prisma.sorteio.count({
                where: { campanha: { associacaoId } },
            });
        } catch {
            throw new ErroAplicacao("Erro ao contar sorteios", 500);
        }
    }

    async listarCandidatosAtividades(associacaoId: number): Promise<CandidatoAtividade[]> {
        try {
            const [pendentes, aprovados, campanhas, sorteios] = await Promise.all([
                this.prisma.lojista.findMany({
                    where: { associacaoId, status: StatusLojista.PENDENTE },
                    orderBy: { dataCriacao: "desc" },
                    take: LIMITE_CANDIDATOS,
                    select: { id: true, nomeFantasia: true, dataCriacao: true },
                }),
                this.prisma.lojista.findMany({
                    where: { associacaoId, status: StatusLojista.APROVADO },
                    orderBy: { dataAtualizacao: "desc" },
                    take: LIMITE_CANDIDATOS,
                    select: { id: true, nomeFantasia: true, dataAtualizacao: true },
                }),
                this.prisma.campanha.findMany({
                    where: { associacaoId },
                    orderBy: { dataCriacao: "desc" },
                    take: LIMITE_CANDIDATOS,
                    select: { id: true, nome: true, dataCriacao: true },
                }),
                this.prisma.sorteio.findMany({
                    where: { campanha: { associacaoId } },
                    orderBy: { dataCriacao: "desc" },
                    take: LIMITE_CANDIDATOS,
                    select: {
                        id: true,
                        dataCriacao: true,
                        campanha: { select: { nome: true } },
                    },
                }),
            ]);

            return [
                ...pendentes.map((item) => ({
                    tipo: "LOJA_PENDENTE" as const,
                    entidadeId: item.id,
                    titulo: `Nova loja "${item.nomeFantasia}" solicitou pré-cadastro`,
                    ocorridoEm: item.dataCriacao,
                })),
                ...aprovados.map((item) => ({
                    tipo: "LOJA_APROVADA" as const,
                    entidadeId: item.id,
                    titulo: `Loja "${item.nomeFantasia}" aprovada`,
                    ocorridoEm: item.dataAtualizacao,
                })),
                ...campanhas.map((item) => ({
                    tipo: "CAMPANHA_CRIADA" as const,
                    entidadeId: item.id,
                    titulo: `Campanha "${item.nome}" foi criada`,
                    ocorridoEm: item.dataCriacao,
                })),
                ...sorteios.map((item) => ({
                    tipo: "SORTEIO_CRIADO" as const,
                    entidadeId: item.id,
                    titulo: `Sorteio da campanha "${item.campanha.nome}" foi criado`,
                    ocorridoEm: item.dataCriacao,
                })),
            ];
        } catch {
            throw new ErroAplicacao("Erro ao listar atividades do dashboard", 500);
        }
    }
}
