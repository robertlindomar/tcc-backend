import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Consumidor } from "../model/Consumidor";
import { RespostaVisitanteLoja } from "../dtos/RespostaVisitanteLoja";

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

type FiltroVisitaLoja = {
    missao: {
        lojistaId: number;
        sistema: true;
    };
};

export class RepositorioConsumidor {
    constructor(private readonly prisma: PrismaClient) {}

    async criar(dados: {
        cpf: string;
        usuarioId: number;
        sexoId: number | null;
        lojistaId: number | null;
    }): Promise<Consumidor> {
        try {
            const criado = await this.prisma.consumidor.create({ data: dados });
            return this.paraDominio(criado);
        } catch {
            throw new ErroAplicacao("Erro ao criar consumidor", 500);
        }
    }

    async listar(): Promise<Consumidor[]> {
        try {
            const lista = await this.prisma.consumidor.findMany({
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar consumidores", 500);
        }
    }

    async listarVisitantesPorLoja(lojistaId: number): Promise<RespostaVisitanteLoja[]> {
        try {
            const grupos = await this.prisma.missaoConsumidor.groupBy({
                by: ["consumidorId"],
                where: this.filtroVisita(lojistaId),
                _count: { id: true },
                _min: { dataCriacao: true },
                _max: { dataCriacao: true },
                orderBy: { _max: { dataCriacao: "desc" } },
            });

            if (grupos.length === 0) {
                return [];
            }

            const consumidores = await this.prisma.consumidor.findMany({
                where: { id: { in: grupos.map((grupo) => grupo.consumidorId) } },
                select: {
                    id: true,
                    usuario: { select: { nome: true } },
                },
            });
            const nomes = new Map(
                consumidores.map((item) => [item.id, item.usuario.nome] as const),
            );

            return grupos.flatMap((grupo) => {
                const nome = nomes.get(grupo.consumidorId);
                const primeiraVisita = grupo._min.dataCriacao;
                const ultimaVisita = grupo._max.dataCriacao;
                if (!nome || !primeiraVisita || !ultimaVisita) {
                    return [];
                }
                return [
                    {
                        id: grupo.consumidorId,
                        nome,
                        quantidadeVisitas: grupo._count.id,
                        primeiraVisita,
                        ultimaVisita,
                    },
                ];
            });
        } catch {
            throw new ErroAplicacao("Erro ao listar visitantes da loja", 500);
        }
    }

    async buscarVisitanteDaLoja(
        consumidorId: number,
        lojistaId: number,
    ): Promise<RespostaVisitanteLoja | null> {
        try {
            const grupos = await this.prisma.missaoConsumidor.groupBy({
                by: ["consumidorId"],
                where: {
                    consumidorId,
                    ...this.filtroVisita(lojistaId),
                },
                _count: { id: true },
                _min: { dataCriacao: true },
                _max: { dataCriacao: true },
            });
            const grupo = grupos[0];
            if (!grupo) {
                return null;
            }

            const consumidor = await this.prisma.consumidor.findUnique({
                where: { id: consumidorId },
                select: {
                    id: true,
                    usuario: { select: { nome: true } },
                },
            });
            if (!consumidor || !grupo._min.dataCriacao || !grupo._max.dataCriacao) {
                return null;
            }

            return {
                id: consumidor.id,
                nome: consumidor.usuario.nome,
                quantidadeVisitas: grupo._count.id,
                primeiraVisita: grupo._min.dataCriacao,
                ultimaVisita: grupo._max.dataCriacao,
            };
        } catch {
            throw new ErroAplicacao("Erro ao buscar visitante da loja", 500);
        }
    }

    async buscar(id: number): Promise<Consumidor | null> {
        try {
            const item = await this.prisma.consumidor.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar consumidor por ID", 500);
        }
    }

    async buscarPorUsuarioId(usuarioId: number): Promise<Consumidor | null> {
        try {
            const item = await this.prisma.consumidor.findUnique({
                where: { usuarioId },
            });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar consumidor por usuario", 500);
        }
    }

    async buscarPorCpf(cpf: string): Promise<Consumidor | null> {
        try {
            const item = await this.prisma.consumidor.findUnique({ where: { cpf } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar consumidor por CPF", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            cpf: string;
            sexoId: number | null;
        },
    ): Promise<Consumidor> {
        try {
            const atualizado = await this.prisma.consumidor.update({
                where: { id },
                data: dados,
            });
            return this.paraDominio(atualizado);
        } catch {
            throw new ErroAplicacao("Erro ao atualizar consumidor", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.consumidor.delete({ where: { id } });
        } catch {
            throw new ErroAplicacao("Erro ao deletar consumidor", 500);
        }
    }

    private filtroVisita(lojistaId: number): FiltroVisitaLoja {
        return {
            missao: {
                lojistaId,
                sistema: true,
            },
        };
    }

    private paraDominio(item: RegistroConsumidor): Consumidor {
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
