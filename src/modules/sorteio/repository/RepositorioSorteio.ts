import { PRAZO_SORTEIO_MS } from "../utils/prazoSorteio";
import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ehViolacaoUnica } from "../../../shared/erros/errosPrisma";
import { decimalParaNumero } from "../../../shared/utils/decimalParaNumero";
import { SituacaoResultadoSorteio, Sorteio } from "../model/Sorteio";

const incluirResultados = {
    resultados: {
        orderBy: { id: "desc" as const },
        include: {
            ticket: {
                select: {
                    consumidor: {
                        select: {
                            id: true,
                            cpf: true,
                            usuario: { select: { nome: true, email: true } },
                        },
                    },
                },
            },
        },
    },
};

type RegistroSorteio = {
    id: number;
    qrcode: string | null;
    campanhaId: number;
    edicao: number;
    dataInicioEdicao: Date;
    dataFimEdicao: Date;
    valorPorTicketEdicao: { toString(): string } | number;
    dataCriacao: Date;
    dataAtualizacao: Date;
    resultados: {
        id: number;
        ticketId: number;
        numeroSorteado: number;
        totalTickets: number;
        situacao: SituacaoResultadoSorteio;
        dataSorteio: Date;
        dataConfirmacaoLeitura: Date | null;
        dataAtualizacao: Date;
        ticket: {
            consumidor: {
                id: number;
                cpf: string;
                usuario: { nome: string; email: string };
            };
        };
    }[];
};

/** Sorteio nasce com a edição da campanha (RepositorioCampanha); aqui não há criação/exclusão. */
export class RepositorioSorteio {
    constructor(private readonly prisma: PrismaClient) {}

    async listarPorAssociacaoId(associacaoId: number): Promise<Sorteio[]> {
        try {
            const lista = await this.prisma.sorteio.findMany({
                where: { campanha: { associacaoId } },
                orderBy: [{ campanhaId: "asc" }, { edicao: "asc" }],
                include: incluirResultados,
            });
            const contagens = await this.prisma.ticket.groupBy({
                by: ["campanhaId", "edicao"],
                where: { campanha: { associacaoId } },
                _count: { _all: true },
            });
            const tickets = new Map(
                contagens.map((c) => [`${c.campanhaId}:${c.edicao}`, c._count._all]),
            );
            return lista.map((item) =>
                this.paraDominio(item, tickets.get(`${item.campanhaId}:${item.edicao}`) ?? 0),
            );
        } catch {
            throw new ErroAplicacao("Erro ao listar sorteios", 500);
        }
    }

    async buscar(id: number): Promise<Sorteio | null> {
        try {
            const item = await this.prisma.sorteio.findUnique({
                where: { id },
                include: incluirResultados,
            });
            if (!item) {
                return null;
            }
            const totalTickets = await this.prisma.ticket.count({
                where: { campanhaId: item.campanhaId, edicao: item.edicao },
            });
            return this.paraDominio(item, totalTickets);
        } catch {
            throw new ErroAplicacao("Erro ao buscar sorteio por ID", 500);
        }
    }

    async buscarTicketIdPorNumero(
        campanhaId: number,
        edicao: number,
        numero: number,
    ): Promise<number | null> {
        try {
            const ticket = await this.prisma.ticket.findUnique({
                where: { campanhaId_edicao_numero: { campanhaId, edicao, numero } },
                select: { id: true },
            });
            return ticket?.id ?? null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar ticket sorteado", 500);
        }
    }

    /**
     * Grava um novo resultado `AGUARDANDO_ENTREGA`. Com `cancelarResultadoId`,
     * cancela o resultado pendente na mesma transação (refazer sorteio).
     * O ticket vencedor precisa ser da mesma campanha + edição do sorteio.
     * O índice único parcial garante 1 resultado ativo por sorteio (409 em corrida).
     */
    async registrarResultado(dados: {
        sorteioId: number;
        ticketId: number;
        numeroSorteado: number;
        totalTickets: number;
        cancelarResultadoId?: number;
        agora: Date;
    }): Promise<void> {
        try {
            await this.prisma.$transaction(async (tx) => {
                const [sorteio, ticket] = await Promise.all([
                    tx.sorteio.findUnique({
                        where: { id: dados.sorteioId },
                        select: { campanhaId: true, edicao: true },
                    }),
                    tx.ticket.findUnique({
                        where: { id: dados.ticketId },
                        select: { campanhaId: true, edicao: true, numero: true },
                    }),
                ]);
                if (
                    !sorteio ||
                    !ticket ||
                    ticket.campanhaId !== sorteio.campanhaId ||
                    ticket.edicao !== sorteio.edicao ||
                    ticket.numero !== dados.numeroSorteado
                ) {
                    throw new ErroAplicacao("Ticket sorteado nao pertence a edicao do sorteio", 409, {
                        codigo: "TICKET_EDICAO_INVALIDA",
                    });
                }

                if (dados.cancelarResultadoId !== undefined) {
                    const cancelados = await tx.resultadoSorteio.updateMany({
                        where: {
                            id: dados.cancelarResultadoId,
                            sorteioId: dados.sorteioId,
                            situacao: "AGUARDANDO_ENTREGA",
                            dataSorteio: { lt: new Date(dados.agora.getTime() - PRAZO_SORTEIO_MS) },
                        },
                        data: { situacao: "CANCELADO" },
                    });
                    if (cancelados.count !== 1) {
                        throw new ErroAplicacao("Resultado do sorteio mudou; recarregue", 409);
                    }
                }
                await tx.resultadoSorteio.create({
                    data: {
                        sorteioId: dados.sorteioId,
                        ticketId: dados.ticketId,
                        numeroSorteado: dados.numeroSorteado,
                        totalTickets: dados.totalTickets,
                        dataSorteio: dados.agora,
                    },
                });
            });
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            if (ehViolacaoUnica(erro)) {
                throw new ErroAplicacao("Sorteio ja possui resultado ativo", 409, {
                    codigo: "SORTEIO_JA_REALIZADO",
                });
            }
            throw new ErroAplicacao("Erro ao registrar resultado do sorteio", 500);
        }
    }

    /** Retorna false se o resultado não estava mais `AGUARDANDO_ENTREGA`. */
    async confirmarEntrega(resultadoId: number, agora: Date): Promise<boolean> {
        try {
            const atualizados = await this.prisma.resultadoSorteio.updateMany({
                where: {
                    id: resultadoId, situacao: "AGUARDANDO_ENTREGA",
                    dataConfirmacaoLeitura: { not: null },
                    dataSorteio: { gte: new Date(agora.getTime() - PRAZO_SORTEIO_MS) },
                },
                data: { situacao: "ENTREGUE" },
            });
            return atualizados.count === 1;
        } catch {
            throw new ErroAplicacao("Erro ao confirmar entrega do sorteio", 500);
        }
    }

    private paraDominio(item: RegistroSorteio, totalTickets: number): Sorteio {
        return new Sorteio({
            id: item.id,
            qrcode: item.qrcode,
            campanhaId: item.campanhaId,
            edicao: item.edicao,
            dataInicioEdicao: item.dataInicioEdicao,
            dataFimEdicao: item.dataFimEdicao,
            valorPorTicketEdicao: decimalParaNumero(item.valorPorTicketEdicao),
            totalTickets,
            resultados: item.resultados.map((resultado) => ({
                id: resultado.id,
                ticketId: resultado.ticketId,
                numeroSorteado: resultado.numeroSorteado,
                totalTickets: resultado.totalTickets,
                situacao: resultado.situacao,
                dataSorteio: resultado.dataSorteio,
                dataConfirmacaoLeitura: resultado.dataConfirmacaoLeitura,
                dataAtualizacao: resultado.dataAtualizacao,
                vencedor: {
                    consumidorId: resultado.ticket.consumidor.id,
                    nome: resultado.ticket.consumidor.usuario.nome,
                    email: resultado.ticket.consumidor.usuario.email,
                    cpf: resultado.ticket.consumidor.cpf,
                },
            })),
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
