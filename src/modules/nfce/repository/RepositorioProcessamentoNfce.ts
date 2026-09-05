import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { decimalParaNumero } from "../../../shared/utils/decimalParaNumero";
import { calcularTicketsEResidual } from "../utils/calcularTicketsEResidual";

function ehViolacaoUnica(erro: unknown): boolean {
    return (
        typeof erro === "object" &&
        erro !== null &&
        "code" in erro &&
        (erro as { code: unknown }).code === "P2002"
    );
}

export type ResultadoCreditoNfce = {
    processamentoId: number;
    campanhaId: number;
    consumidorId: number;
    lojistaId: number;
    chaveAcesso: string;
    valorNota: number;
    ticketsGerados: number;
    residualAntes: number;
    residualApos: number;
    ticketsTotaisCampanha: number;
    dataEmissao: Date;
};

/**
 * Persiste NFC-e + residual na mesma transação.
 * UNIQUE de chave → 409; residual trava por (consumidor, campanha).
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
        valorPorTicket: number;
    }): Promise<ResultadoCreditoNfce> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                await tx.residualTicketCampanha.createMany({
                    data: [
                        {
                            consumidorId: dados.consumidorId,
                            campanhaId: dados.campanhaId,
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
                    FOR UPDATE
                `;

                const residual = await tx.residualTicketCampanha.findUnique({
                    where: {
                        consumidorId_campanhaId: {
                            consumidorId: dados.consumidorId,
                            campanhaId: dados.campanhaId,
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
                    valorPorTicket: dados.valorPorTicket,
                });

                let processamento;
                try {
                    processamento = await tx.processamentoNfce.create({
                        data: {
                            chaveAcesso: dados.chaveAcesso,
                            campanhaId: dados.campanhaId,
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
                        throw new ErroAplicacao("Nota fiscal ja utilizada", 409);
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

                return {
                    processamentoId: processamento.id,
                    campanhaId: dados.campanhaId,
                    consumidorId: dados.consumidorId,
                    lojistaId: dados.lojistaId,
                    chaveAcesso: dados.chaveAcesso,
                    valorNota: dados.valorNota,
                    ticketsGerados: calculo.tickets,
                    residualAntes,
                    residualApos: calculo.residualNovo,
                    ticketsTotaisCampanha: residualAtualizado.ticketsTotais,
                    dataEmissao: dados.dataEmissao,
                };
            });
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            if (ehViolacaoUnica(erro)) {
                throw new ErroAplicacao("Nota fiscal ja utilizada", 409);
            }
            throw new ErroAplicacao("Erro ao processar NFC-e", 500);
        }
    }
}
