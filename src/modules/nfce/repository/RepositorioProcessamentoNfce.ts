import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ehViolacaoUnica } from "../../../shared/erros/errosPrisma";
import { decimalParaNumero } from "../../../shared/utils/decimalParaNumero";
import { calcularTicketsEResidual } from "../utils/calcularTicketsEResidual";

export type ResultadoCreditoNfce = {
    processamentoId: number;
    campanhaId: number;
    /** Edição da campanha em que a nota foi creditada. */
    edicao: number;
    consumidorId: number;
    lojistaId: number;
    chaveAcesso: string;
    valorNota: number;
    ticketsGerados: number;
    residualAntes: number;
    residualApos: number;
    /** Tickets do consumidor na edição atual da campanha. */
    ticketsTotaisCampanha: number;
    /** Faixa de números dos tickets criados nesta nota; null se a nota não gerou ticket. */
    numerosTickets: { primeiro: number; ultimo: number } | null;
    dataEmissao: Date;
};

const erroNfceJaUtilizada = () =>
    new ErroAplicacao("Nota fiscal ja utilizada", 409, { codigo: "NFCE_JA_UTILIZADA" });

/**
 * Persiste NFC-e + residual + tickets numerados na mesma transação.
 * Ordem de locks: campanha (FOR UPDATE) → residual da edição. A edição, o
 * período e o valor por ticket são relidos com a campanha travada, então uma
 * reativação concorrente não mistura edições. UNIQUE global da chave → 409.
 */
export class RepositorioProcessamentoNfce {
    constructor(private readonly prisma: PrismaClient) {}

    async processarComCredito(dados: {
        chaveAcesso: string;
        campanhaId: number;
        consumidorId: number;
        lojistaId: number;
        valorNota: number;
        dataEmissao: Date;
        agora: Date;
    }): Promise<ResultadoCreditoNfce> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw`
                    SELECT id_campanha FROM campanha
                    WHERE id_campanha = ${dados.campanhaId}
                    FOR UPDATE
                `;
                const campanha = await tx.campanha.findUnique({ where: { id: dados.campanhaId } });
                if (!campanha) {
                    throw new ErroAplicacao("Campanha nao encontrada", 404);
                }
                if (!campanha.ativa) {
                    throw new ErroAplicacao("Campanha inativa", 400, { codigo: "CAMPANHA_INATIVA" });
                }
                if (
                    dados.agora.getTime() < campanha.dataInicio.getTime() ||
                    dados.agora.getTime() > campanha.dataFim.getTime()
                ) {
                    throw new ErroAplicacao("Campanha fora do periodo vigente", 400, {
                        codigo: "CAMPANHA_NAO_VIGENTE",
                    });
                }
                if (
                    dados.dataEmissao.getTime() < campanha.dataInicio.getTime() ||
                    dados.dataEmissao.getTime() > campanha.dataFim.getTime()
                ) {
                    throw new ErroAplicacao("Data da compra fora do periodo da campanha", 400, {
                        codigo: "NFCE_FORA_PERIODO",
                    });
                }
                const edicao = campanha.edicao;

                await tx.residualTicketCampanha.createMany({
                    data: [
                        {
                            consumidorId: dados.consumidorId,
                            campanhaId: dados.campanhaId,
                            edicao,
                            valorResidual: 0,
                            ticketsTotais: 0,
                        },
                    ],
                    skipDuplicates: true,
                });

                await tx.$executeRaw`
                    SELECT id_residual_ticket_campanha FROM residual_ticket_campanha
                    WHERE id_consumidor = ${dados.consumidorId}
                      AND id_campanha = ${dados.campanhaId}
                      AND edicao_campanha = ${edicao}
                    FOR UPDATE
                `;

                const residual = await tx.residualTicketCampanha.findUnique({
                    where: {
                        consumidorId_campanhaId_edicao: {
                            consumidorId: dados.consumidorId,
                            campanhaId: dados.campanhaId,
                            edicao,
                        },
                    },
                });
                if (!residual) {
                    throw new ErroAplicacao("Residual da campanha nao encontrado", 500);
                }

                const residualAntes = decimalParaNumero(residual.valorResidual);
                const calculo = calcularTicketsEResidual({
                    valorNota: dados.valorNota,
                    residualAnterior: residualAntes,
                    valorPorTicket: decimalParaNumero(campanha.valorPorTicket),
                });

                let processamento;
                try {
                    processamento = await tx.processamentoNfce.create({
                        data: {
                            chaveAcesso: dados.chaveAcesso,
                            campanhaId: dados.campanhaId,
                            edicao,
                            consumidorId: dados.consumidorId,
                            lojistaId: dados.lojistaId,
                            valorNota: dados.valorNota,
                            ticketsGerados: calculo.tickets,
                            residualAntes,
                            residualApos: calculo.residualNovo,
                            dataEmissao: dados.dataEmissao,
                        },
                    });
                } catch (erro) {
                    if (ehViolacaoUnica(erro)) {
                        throw erroNfceJaUtilizada();
                    }
                    throw erro;
                }

                const residualAtualizado = await tx.residualTicketCampanha.update({
                    where: { id: residual.id },
                    data: {
                        valorResidual: calculo.residualNovo,
                        ticketsTotais: { increment: calculo.tickets },
                    },
                });

                let numerosTickets: ResultadoCreditoNfce["numerosTickets"] = null;
                if (calculo.tickets > 0) {
                    const agregado = await tx.ticket.aggregate({
                        where: { campanhaId: dados.campanhaId, edicao },
                        _max: { numero: true },
                    });
                    const primeiro = (agregado._max.numero ?? 0) + 1;
                    await tx.ticket.createMany({
                        data: Array.from({ length: calculo.tickets }, (_, indice) => ({
                            numero: primeiro + indice,
                            campanhaId: dados.campanhaId,
                            edicao,
                            consumidorId: dados.consumidorId,
                            processamentoNfceId: processamento.id,
                        })),
                    });
                    numerosTickets = { primeiro, ultimo: primeiro + calculo.tickets - 1 };
                }

                return {
                    processamentoId: processamento.id,
                    campanhaId: dados.campanhaId,
                    edicao,
                    consumidorId: dados.consumidorId,
                    lojistaId: dados.lojistaId,
                    chaveAcesso: dados.chaveAcesso,
                    valorNota: dados.valorNota,
                    ticketsGerados: calculo.tickets,
                    residualAntes,
                    residualApos: calculo.residualNovo,
                    ticketsTotaisCampanha: residualAtualizado.ticketsTotais,
                    numerosTickets,
                    dataEmissao: dados.dataEmissao,
                };
            });
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            if (ehViolacaoUnica(erro)) {
                throw erroNfceJaUtilizada();
            }
            throw new ErroAplicacao("Erro ao processar NFC-e", 500);
        }
    }

    /** Tickets, residual e notas lidas pelo consumidor numa edição da campanha (mais recentes primeiro). */
    async buscarExtratoConsumidor(
        consumidorId: number,
        campanhaId: number,
        edicao: number,
        limite = LIMITE_NOTAS_EXTRATO,
    ): Promise<ExtratoConsumidorCampanha> {
        try {
            const [residual, notas] = await Promise.all([
                this.prisma.residualTicketCampanha.findUnique({
                    where: { consumidorId_campanhaId_edicao: { consumidorId, campanhaId, edicao } },
                }),
                this.prisma.processamentoNfce.findMany({
                    where: { consumidorId, campanhaId, edicao },
                    orderBy: [{ dataCriacao: "desc" }, { id: "desc" }],
                    take: limite,
                    include: {
                        lojista: { select: { nomeFantasia: true, cnpj: true } },
                        tickets: { select: { numero: true }, orderBy: { numero: "asc" } },
                    },
                }),
            ]);

            return {
                totalTickets: residual?.ticketsTotais ?? 0,
                valorResidual: residual ? decimalParaNumero(residual.valorResidual) : 0,
                notas: notas.map((nota) => ({
                    id: nota.id,
                    valorNota: decimalParaNumero(nota.valorNota),
                    ticketsGerados: nota.ticketsGerados,
                    numerosTickets: nota.tickets.length
                        ? { primeiro: nota.tickets[0]!.numero, ultimo: nota.tickets[nota.tickets.length - 1]!.numero }
                        : null,
                    dataEmissao: nota.dataEmissao,
                    dataLeitura: nota.dataCriacao,
                    loja: { nome: nota.lojista.nomeFantasia, cnpj: nota.lojista.cnpj },
                })),
            };
        } catch {
            throw new ErroAplicacao("Erro ao buscar extrato da campanha", 500);
        }
    }
}

const LIMITE_NOTAS_EXTRATO = 50;

export type NotaExtratoConsumidor = {
    id: number;
    valorNota: number;
    ticketsGerados: number;
    numerosTickets: { primeiro: number; ultimo: number } | null;
    dataEmissao: Date;
    dataLeitura: Date;
    loja: { nome: string; cnpj: string };
};

export type ExtratoConsumidorCampanha = {
    totalTickets: number;
    valorResidual: number;
    notas: NotaExtratoConsumidor[];
};
