import { PrismaClient } from "../../../generated/prisma/client";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { calcularNivelConsumidor } from "../../../shared/utils/calcularNivelConsumidor";
import { ResgateRecompensa } from "../model/ResgateRecompensa";

type RegistroResgate = {
    id: number;
    recompensaId: number;
    consumidorId: number;
    custoPontosSnapshot: number;
    nomeRecompensaSnapshot: string;
    dataCriacao: Date;
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
        custoPontos: number;
        nomeRecompensa: string;
    }): Promise<{ resgate: ResgateRecompensa; consumidor: Consumidor }> {
        try {
            const resultado = await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw`
                    SELECT id_consumidor FROM consumidor
                    WHERE id_consumidor = ${dados.consumidorId}
                    FOR UPDATE
                `;

                const debito = await tx.consumidor.updateMany({
                    where: {
                        id: dados.consumidorId,
                        pontos: { gte: dados.custoPontos },
                    },
                    data: { pontos: { decrement: dados.custoPontos } },
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
                        recompensaId: dados.recompensaId,
                        consumidorId: dados.consumidorId,
                        custoPontosSnapshot: dados.custoPontos,
                        nomeRecompensaSnapshot: dados.nomeRecompensa,
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

    private paraDominio(item: RegistroResgate): ResgateRecompensa {
        return new ResgateRecompensa({
            id: item.id,
            recompensaId: item.recompensaId,
            consumidorId: item.consumidorId,
            custoPontosSnapshot: item.custoPontosSnapshot,
            nomeRecompensaSnapshot: item.nomeRecompensaSnapshot,
            dataCriacao: item.dataCriacao,
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
