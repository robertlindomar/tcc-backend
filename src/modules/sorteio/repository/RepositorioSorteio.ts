import { PRAZO_SORTEIO_MS } from "../utils/prazoSorteio";
import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { SituacaoResultadoSorteio, Sorteio } from "../model/Sorteio";

const incluirDetalhes = {
    campanha: {
        select: {
            dataFim: true,
            _count: { select: { tickets: true } },
        },
    },
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
    dataCriacao: Date;
    dataAtualizacao: Date;
    campanha: { dataFim: Date; _count: { tickets: number } };
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

function ehViolacaoUnica(erro: unknown): boolean {
    return (
        typeof erro === "object" &&
        erro !== null &&
        "code" in erro &&
        (erro as { code: unknown }).code === "P2002"
    );
}

export class RepositorioSorteio {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        campanhaId: number;
        qrcode: string | null;
    }): Promise<Sorteio> {
        try {
            const criado = await this.prisma.sorteio.create({
                data: dados,
                include: incluirDetalhes,
            });
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
                include: incluirDetalhes,
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar sorteios", 500);
        }
    }

    async buscar(id: number): Promise<Sorteio | null> {
        try {
            const item = await this.prisma.sorteio.findUnique({
                where: { id },
                include: incluirDetalhes,
            });
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
                include: incluirDetalhes,
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

    async buscarTicketIdPorNumero(campanhaId: number, numero: number): Promise<number | null> {
        try {
            const ticket = await this.prisma.ticket.findUnique({
                where: { campanhaId_numero: { campanhaId, numero } },
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

    private paraDominio(item: RegistroSorteio): Sorteio {
        return new Sorteio({
            id: item.id,
            qrcode: item.qrcode,
            campanhaId: item.campanhaId,
            dataFimCampanha: item.campanha.dataFim,
            totalTickets: item.campanha._count.tickets,
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
