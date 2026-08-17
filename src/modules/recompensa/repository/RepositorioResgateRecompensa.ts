import { PrismaClient } from "../../../generated/prisma/client";
import { StatusLojista, StatusResgateRecompensa } from "../../../generated/prisma/enums";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { missaoEstaExpirada } from "../../../shared/tempo/calcularChavePeriodoMissao";
import { calcularNivelConsumidor } from "../../../shared/utils/calcularNivelConsumidor";
import { ResgateRecompensa } from "../model/ResgateRecompensa";

type RegistroResgate = {
    id: number;
    recompensaId: number;
    consumidorId: number;
    custoPontosSnapshot: number;
    nomeRecompensaSnapshot: string;
    status: StatusResgateRecompensa;
    dataEntrega: Date | null;
    dataCriacao: Date;
    consumidor?: { usuario: { nome: string } };
};

type RegistroConsumidor = {
    id: number;
    cpf: string;
    pontos: number;
    nivel: number;
    sexoId: number | null;
    lojistaId: number | null;
    usuarioId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

export class RepositorioResgateRecompensa {
    constructor(private readonly prisma: PrismaClient) {}

    async resgatarComDebito(dados: {
        recompensaId: number;
        consumidorId: number;
        agora?: Date;
    }): Promise<{ resgate: ResgateRecompensa; consumidor: Consumidor }> {
        const agora = dados.agora ?? new Date();
        try {
            const resultado = await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw`
                    SELECT id_recompensa FROM recompensa
                    WHERE id_recompensa = ${dados.recompensaId}
                    FOR UPDATE
                `;

                const recompensa = await tx.recompensa.findUnique({
                    where: { id: dados.recompensaId },
                });
                if (!recompensa) {
                    throw new ErroAplicacao("Recompensa nao encontrada", 404);
                }

                const lojista = await tx.lojista.findUnique({
                    where: { id: recompensa.lojistaId },
                });
                if (!lojista || lojista.status !== StatusLojista.APROVADO) {
                    throw new ErroAplicacao("Loja nao aprovada", 403);
                }
                if (!recompensa.ativa) {
                    throw new ErroAplicacao("Recompensa nao disponivel", 400);
                }
                if (missaoEstaExpirada(recompensa.dataFim, agora)) {
                    throw new ErroAplicacao("Recompensa expirada", 400);
                }
                if (recompensa.estoque === 0) {
                    throw new ErroAplicacao("Recompensa esgotada", 400);
                }

                await tx.$executeRaw`
                    SELECT id_consumidor FROM consumidor
                    WHERE id_consumidor = ${dados.consumidorId}
                    FOR UPDATE
                `;

                const consumidorTravado = await tx.consumidor.findUnique({
                    where: { id: dados.consumidorId },
                });
                if (!consumidorTravado) {
                    throw new ErroAplicacao("Consumidor nao encontrado", 404);
                }
                if (consumidorTravado.pontos < recompensa.custoPontos) {
                    throw new ErroAplicacao("Pontos insuficientes", 400);
                }

                if (recompensa.estoque !== null) {
                    const estoque = await tx.recompensa.updateMany({
                        where: { id: recompensa.id, estoque: { gt: 0 } },
                        data: { estoque: { decrement: 1 } },
                    });
                    if (estoque.count !== 1) {
                        throw new ErroAplicacao("Recompensa esgotada", 400);
                    }
                }

                const debito = await tx.consumidor.updateMany({
                    where: {
                        id: dados.consumidorId,
                        pontos: { gte: recompensa.custoPontos },
                    },
                    data: { pontos: { decrement: recompensa.custoPontos } },
                });
                if (debito.count !== 1) {
                    throw new ErroAplicacao("Pontos insuficientes", 400);
                }

                const consumidorAtual = await tx.consumidor.findUnique({
                    where: { id: dados.consumidorId },
                });
                if (!consumidorAtual) {
                    throw new ErroAplicacao("Consumidor nao encontrado", 404);
                }
                if (consumidorAtual.pontos < 0) {
                    throw new ErroAplicacao("Saldo nao pode ficar negativo", 500);
                }

                const nivel = calcularNivelConsumidor(consumidorAtual.pontos);
                const consumidorAtualizado = await tx.consumidor.update({
                    where: { id: dados.consumidorId },
                    data: { nivel },
                });

                const criado = await tx.resgateRecompensa.create({
                    data: {
                        recompensaId: recompensa.id,
                        consumidorId: dados.consumidorId,
                        custoPontosSnapshot: recompensa.custoPontos,
                        nomeRecompensaSnapshot: recompensa.nome,
                        status: StatusResgateRecompensa.PENDENTE_ENTREGA,
                        dataEntrega: null,
                    },
                });

                return { criado, consumidorAtualizado };
            });

            return {
                resgate: this.paraDominio(resultado.criado),
                consumidor: this.paraDominioConsumidor(resultado.consumidorAtualizado),
            };
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            throw new ErroAplicacao("Erro ao resgatar recompensa", 500);
        }
    }

    async confirmarEntrega(dados: {
        resgateId: number;
        lojistaId: number;
        agora?: Date;
    }): Promise<ResgateRecompensa> {
        const agora = dados.agora ?? new Date();
        try {
            const resultado = await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw`
                    SELECT id_resgate_recompensa FROM resgate_recompensa
                    WHERE id_resgate_recompensa = ${dados.resgateId}
                    FOR UPDATE
                `;

                const resgate = await tx.resgateRecompensa.findUnique({
                    where: { id: dados.resgateId },
                    include: {
                        recompensa: { select: { lojistaId: true } },
                        consumidor: { select: { usuario: { select: { nome: true } } } },
                    },
                });
                if (!resgate || resgate.recompensa.lojistaId !== dados.lojistaId) {
                    throw new ErroAplicacao("Resgate nao encontrado", 404);
                }
                if (resgate.status === StatusResgateRecompensa.ENTREGUE) {
                    return resgate;
                }

                return tx.resgateRecompensa.update({
                    where: { id: resgate.id },
                    data: {
                        status: StatusResgateRecompensa.ENTREGUE,
                        dataEntrega: agora,
                    },
                    include: {
                        consumidor: { select: { usuario: { select: { nome: true } } } },
                    },
                });
            });

            return this.paraDominio(resultado);
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            throw new ErroAplicacao("Erro ao confirmar entrega", 500);
        }
    }

    async listarPorConsumidorId(consumidorId: number): Promise<ResgateRecompensa[]> {
        try {
            const lista = await this.prisma.resgateRecompensa.findMany({
                where: { consumidorId },
                orderBy: { id: "desc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar resgates", 500);
        }
    }

    async listarPorLojistaId(lojistaId: number): Promise<ResgateRecompensa[]> {
        try {
            const lista = await this.prisma.resgateRecompensa.findMany({
                where: { recompensa: { lojistaId } },
                include: {
                    consumidor: { select: { usuario: { select: { nome: true } } } },
                },
                orderBy: { id: "desc" },
            });
            const pendentes = lista.filter(
                (item) => item.status === StatusResgateRecompensa.PENDENTE_ENTREGA,
            );
            const entregues = lista.filter(
                (item) => item.status === StatusResgateRecompensa.ENTREGUE,
            );
            return [...pendentes, ...entregues].map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar resgates da loja", 500);
        }
    }

    private paraDominio(item: RegistroResgate): ResgateRecompensa {
        return new ResgateRecompensa({
            id: item.id,
            recompensaId: item.recompensaId,
            consumidorId: item.consumidorId,
            custoPontosSnapshot: item.custoPontosSnapshot,
            nomeRecompensaSnapshot: item.nomeRecompensaSnapshot,
            status: item.status,
            dataEntrega: item.dataEntrega,
            dataCriacao: item.dataCriacao,
            nomeConsumidor: item.consumidor?.usuario.nome ?? null,
        });
    }

    private paraDominioConsumidor(item: RegistroConsumidor): Consumidor {
        return new Consumidor({
            id: item.id,
            cpf: item.cpf,
            pontos: item.pontos,
            nivel: item.nivel,
            sexoId: item.sexoId,
            lojistaId: item.lojistaId,
            usuarioId: item.usuarioId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
