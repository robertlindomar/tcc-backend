import { PrismaClient } from "../../../generated/prisma/client";
import { Consumidor } from "../../consumidor/model/Consumidor";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { calcularNivelConsumidor } from "../../../shared/utils/calcularNivelConsumidor";
import { MissaoConsumidor } from "../model/MissaoConsumidor";

type RegistroMissaoConsumidor = {
    id: number;
    missaoId: number;
    consumidorId: number;
    chavePeriodo: string;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

type RegistroComMissao = RegistroMissaoConsumidor & {
    missao: {
        nome: string;
        pontoRecompensa: number;
    };
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

function ehViolacaoUnica(erro: unknown): boolean {
    return (
        typeof erro === "object" &&
        erro !== null &&
        "code" in erro &&
        (erro as { code: unknown }).code === "P2002"
    );
}

export class RepositorioMissaoConsumidor {
    constructor(private readonly prisma: PrismaClient) {}

    async concluirComPontos(dados: {
        missaoId: number;
        consumidorId: number;
        chavePeriodo: string;
        pontoRecompensa: number;
    }): Promise<{ missaoConsumidor: MissaoConsumidor; consumidor: Consumidor }> {
        try {
            const resultado = await this.prisma.$transaction(async (tx) => {
                const criado = await tx.missaoConsumidor.create({
                    data: {
                        missaoId: dados.missaoId,
                        consumidorId: dados.consumidorId,
                        chavePeriodo: dados.chavePeriodo,
                    },
                });

                const consumidorAtual = await tx.consumidor.findUnique({
                    where: { id: dados.consumidorId },
                });

                if (!consumidorAtual) {
                    throw new ErroAplicacao("Consumidor nao encontrado", 404);
                }

                const pontos = consumidorAtual.pontos + dados.pontoRecompensa;
                const nivel = calcularNivelConsumidor(pontos);

                const consumidorAtualizado = await tx.consumidor.update({
                    where: { id: dados.consumidorId },
                    data: { pontos, nivel },
                });

                return { criado, consumidorAtualizado };
            });

            return {
                missaoConsumidor: this.paraDominio(resultado.criado),
                consumidor: this.paraDominioConsumidor(resultado.consumidorAtualizado),
            };
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            if (ehViolacaoUnica(erro)) {
                throw new ErroAplicacao("Missao ja concluida neste periodo", 409);
            }
            throw new ErroAplicacao("Erro ao concluir missao", 500);
        }
    }

    async listarPorConsumidorId(consumidorId: number): Promise<MissaoConsumidor[]> {
        try {
            const lista = await this.prisma.missaoConsumidor.findMany({
                where: { consumidorId },
                include: {
                    missao: {
                        select: { nome: true, pontoRecompensa: true },
                    },
                },
                orderBy: [{ dataCriacao: "desc" }, { id: "desc" }],
            });
            return lista.map((item) => this.paraDominioComMissao(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar missoes concluidas", 500);
        }
    }

    async buscar(id: number): Promise<MissaoConsumidor | null> {
        try {
            const item = await this.prisma.missaoConsumidor.findUnique({
                where: { id },
                include: {
                    missao: {
                        select: { nome: true, pontoRecompensa: true },
                    },
                },
            });
            return item ? this.paraDominioComMissao(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar missao concluida por ID", 500);
        }
    }

    async buscarPorMissaoConsumidorPeriodo(
        missaoId: number,
        consumidorId: number,
        chavePeriodo: string,
    ): Promise<MissaoConsumidor | null> {
        try {
            const item = await this.prisma.missaoConsumidor.findUnique({
                where: {
                    missaoId_consumidorId_chavePeriodo: {
                        missaoId,
                        consumidorId,
                        chavePeriodo,
                    },
                },
            });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar conclusao de missao", 500);
        }
    }

    async contarPorMissaoId(missaoId: number): Promise<number> {
        try {
            return await this.prisma.missaoConsumidor.count({ where: { missaoId } });
        } catch {
            throw new ErroAplicacao("Erro ao contar conclusoes da missao", 500);
        }
    }

    private paraDominio(item: RegistroMissaoConsumidor): MissaoConsumidor {
        return new MissaoConsumidor({
            id: item.id,
            missaoId: item.missaoId,
            consumidorId: item.consumidorId,
            chavePeriodo: item.chavePeriodo,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }

    private paraDominioComMissao(item: RegistroComMissao): MissaoConsumidor {
        return new MissaoConsumidor({
            id: item.id,
            missaoId: item.missaoId,
            consumidorId: item.consumidorId,
            chavePeriodo: item.chavePeriodo,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
            nomeMissao: item.missao.nome,
            pontoRecompensa: item.missao.pontoRecompensa,
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
