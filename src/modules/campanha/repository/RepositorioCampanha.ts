import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { SituacaoResultadoSorteio } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ehViolacaoChaveEstrangeira, ehViolacaoUnica } from "../../../shared/erros/errosPrisma";
import { decimalParaNumero } from "../../../shared/utils/decimalParaNumero";
import { Campanha } from "../model/Campanha";
import { snapshotSorteioEdicao } from "../utils/snapshotSorteioEdicao";

type RegistroCampanha = {
    id: number;
    nome: string;
    descricao: string | null;
    qrcode: string | null;
    dataInicio: Date;
    dataFim: Date;
    valorPorTicket: { toString(): string } | number;
    ativa: boolean;
    edicao: number;
    associacaoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
};

type Transacao = Prisma.TransactionClient;

/** Campanha + dados da edição atual (tickets e sorteio). */
export type ResumoCampanha = {
    campanha: Campanha;
    totalTickets: number;
    sorteioId: number | null;
    situacaoResultado: SituacaoResultadoSorteio | null;
};

/** Uma edição lida dos snapshots do Sorteio (nunca do período atual da Campanha). */
export type EdicaoCampanha = {
    edicao: number;
    dataInicio: Date;
    dataFim: Date;
    valorPorTicket: number;
    totalTickets: number;
    sorteioId: number;
    situacaoResultado: SituacaoResultadoSorteio | null;
    dataSorteio: Date | null;
};

export type DadosAtualizarCampanha = {
    nome?: string;
    nomeNormalizado?: string;
    descricao?: string | null;
    qrcode?: string | null;
    dataInicio?: Date;
    dataFim?: Date;
    valorPorTicket?: number;
};

const erroNomeDuplicado = () =>
    new ErroAplicacao("Ja existe uma campanha com esse nome", 409, {
        codigo: "CAMPANHA_NOME_DUPLICADO",
    });

const erroConcorrencia = () =>
    new ErroAplicacao("A campanha foi alterada por outra operacao; recarregue", 409, {
        codigo: "OPERACAO_CONCORRENTE",
    });

export class RepositorioCampanha {
    constructor(private readonly prisma: PrismaClient) {}

    /** Cria a campanha e o sorteio da edição 1 atomicamente. */
    async criarComSorteio(dados: {
        nome: string;
        nomeNormalizado: string;
        descricao: string | null;
        qrcode: string | null;
        dataInicio: Date;
        dataFim: Date;
        valorPorTicket: number;
        associacaoId: number;
    }): Promise<ResumoCampanha> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const criada = await tx.campanha.create({ data: dados });
                const sorteio = await tx.sorteio.create({
                    data: this.dadosSorteioDaEdicao(criada),
                });
                return {
                    campanha: this.paraDominio(criada),
                    totalTickets: 0,
                    sorteioId: sorteio.id,
                    situacaoResultado: null,
                };
            });
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            if (ehViolacaoUnica(erro)) {
                throw erroNomeDuplicado();
            }
            throw new ErroAplicacao("Erro ao criar campanha", 500);
        }
    }

    async listarResumoPorAssociacaoId(associacaoId: number): Promise<ResumoCampanha[]> {
        try {
            const lista = await this.prisma.campanha.findMany({
                where: { associacaoId },
                orderBy: { id: "asc" },
            });
            return this.resumir(lista);
        } catch {
            throw new ErroAplicacao("Erro ao listar campanhas", 500);
        }
    }

    async buscarResumo(id: number): Promise<ResumoCampanha | null> {
        try {
            const item = await this.prisma.campanha.findUnique({ where: { id } });
            if (!item) {
                return null;
            }
            const [resumo] = await this.resumir([item]);
            return resumo ?? null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar campanha por ID", 500);
        }
    }

    async buscarPorNomeNormalizado(
        associacaoId: number,
        nomeNormalizado: string,
        ignorarId?: number,
    ): Promise<Campanha | null> {
        try {
            const item = await this.prisma.campanha.findFirst({
                where: {
                    associacaoId,
                    nomeNormalizado,
                    ...(ignorarId !== undefined ? { id: { not: ignorarId } } : {}),
                },
            });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao verificar nome da campanha", 500);
        }
    }

    /** Primeira campanha ATIVA cujo período cruza [dataInicio, dataFim], ignorando `ignorarId`. */
    async buscarSobrepostaAoPeriodo(
        dataInicio: Date,
        dataFim: Date,
        ignorarId?: number,
    ): Promise<Campanha | null> {
        try {
            const item = await this.prisma.campanha.findFirst({
                where: this.filtroSobreposicao(dataInicio, dataFim, ignorarId),
                orderBy: { dataInicio: "asc" },
            });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao verificar periodo da campanha", 500);
        }
    }

    async listarVigentesEm(agora: Date = new Date()): Promise<Campanha[]> {
        try {
            const lista = await this.prisma.campanha.findMany({
                where: {
                    ativa: true,
                    dataInicio: { lte: agora },
                    dataFim: { gte: agora },
                },
                orderBy: { id: "asc" },
            });
            return lista.map((item) => this.paraDominio(item));
        } catch {
            throw new ErroAplicacao("Erro ao listar campanhas vigentes", 500);
        }
    }

    async buscar(id: number): Promise<Campanha | null> {
        try {
            const item = await this.prisma.campanha.findUnique({ where: { id } });
            return item ? this.paraDominio(item) : null;
        } catch {
            throw new ErroAplicacao("Erro ao buscar campanha por ID", 500);
        }
    }

    /**
     * Atualiza a campanha. Mudanças de período/valor só valem para a edição
     * ainda sem NFC-e processada (inclusive notas com 0 ticket) e sincronizam
     * o snapshot do sorteio da edição. Trava a campanha contra créditos concorrentes.
     */
    async atualizar(id: number, dados: DadosAtualizarCampanha): Promise<ResumoCampanha> {
        const mudaEdicao =
            dados.dataInicio !== undefined ||
            dados.dataFim !== undefined ||
            dados.valorPorTicket !== undefined;
        try {
            await this.prisma.$transaction(async (tx) => {
                const atual = await this.travar(tx, id);
                if (mudaEdicao) {
                    const processamentos = await tx.processamentoNfce.count({
                        where: { campanhaId: id, edicao: atual.edicao },
                    });
                    if (processamentos > 0) {
                        throw new ErroAplicacao(
                            "Periodo e valor por ticket nao podem mudar depois que a edicao recebeu NFC-e",
                            409,
                            { codigo: "CAMPANHA_EDICAO_EM_USO" },
                        );
                    }
                }
                const atualizada = await tx.campanha.update({ where: { id }, data: dados });
                if (mudaEdicao) {
                    await tx.sorteio.updateMany({
                        where: { campanhaId: id, edicao: atualizada.edicao },
                        data: {
                            dataInicioEdicao: atualizada.dataInicio,
                            dataFimEdicao: atualizada.dataFim,
                            valorPorTicketEdicao: atualizada.valorPorTicket,
                        },
                    });
                }
            });
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            if (ehViolacaoUnica(erro)) {
                throw erroNomeDuplicado();
            }
            throw new ErroAplicacao("Erro ao atualizar campanha", 500);
        }
        return this.resumoObrigatorio(id);
    }

    /** Idempotente: não apaga tickets, processamentos, sorteios nem resultados. */
    async inativar(id: number): Promise<ResumoCampanha> {
        try {
            await this.prisma.campanha.update({ where: { id }, data: { ativa: false } });
        } catch {
            throw new ErroAplicacao("Erro ao inativar campanha", 500);
        }
        return this.resumoObrigatorio(id);
    }

    /**
     * Abre a próxima edição: trava a campanha, revalida as condições e, na
     * mesma transação, incrementa `edicao`, grava o período/valor e cria o
     * sorteio da nova edição com o snapshot.
     */
    async reativar(
        id: number,
        dados: { dataInicio: Date; dataFim: Date; valorPorTicket?: number },
        agora: Date,
    ): Promise<ResumoCampanha> {
        try {
            await this.prisma.$transaction(async (tx) => {
                const atual = await this.travar(tx, id);
                if (atual.ativa) {
                    throw new ErroAplicacao("A campanha ja esta ativa", 409, {
                        codigo: "CAMPANHA_JA_ATIVA",
                    });
                }
                if (atual.dataFim.getTime() >= agora.getTime()) {
                    throw new ErroAplicacao(
                        "A edicao atual ainda nao terminou; aguarde o fim do periodo para reativar",
                        409,
                        { codigo: "CAMPANHA_AINDA_VIGENTE" },
                    );
                }

                const ticketsEdicao = await tx.ticket.count({
                    where: { campanhaId: id, edicao: atual.edicao },
                });
                if (ticketsEdicao > 0) {
                    const resultadoAtivo = await tx.resultadoSorteio.count({
                        where: {
                            situacao: { not: "CANCELADO" },
                            sorteio: { campanhaId: id, edicao: atual.edicao },
                        },
                    });
                    if (resultadoAtivo === 0) {
                        throw new ErroAplicacao(
                            `Realize o sorteio da edicao ${atual.edicao} antes de reativar a campanha`,
                            409,
                            { codigo: "SORTEIO_PENDENTE", edicao: atual.edicao },
                        );
                    }
                }

                const conflito = await tx.campanha.findFirst({
                    where: this.filtroSobreposicao(dados.dataInicio, dados.dataFim, id),
                });
                if (conflito) {
                    throw new ErroAplicacao(
                        `Ja existe a campanha "${conflito.nome}" nesse periodo`,
                        409,
                        { codigo: "CAMPANHA_PERIODO_OCUPADO", campanhaConflitanteId: conflito.id },
                    );
                }

                const reativada = await tx.campanha.update({
                    where: { id },
                    data: {
                        edicao: atual.edicao + 1,
                        ativa: true,
                        dataInicio: dados.dataInicio,
                        dataFim: dados.dataFim,
                        ...(dados.valorPorTicket !== undefined
                            ? { valorPorTicket: dados.valorPorTicket }
                            : {}),
                    },
                });
                await tx.sorteio.create({ data: this.dadosSorteioDaEdicao(reativada) });
            });
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            if (ehViolacaoUnica(erro)) {
                throw erroConcorrencia();
            }
            throw new ErroAplicacao("Erro ao reativar campanha", 500);
        }
        return this.resumoObrigatorio(id);
    }

    async listarEdicoes(campanhaId: number): Promise<EdicaoCampanha[]> {
        try {
            const sorteios = await this.prisma.sorteio.findMany({
                where: { campanhaId },
                orderBy: { edicao: "desc" },
                include: {
                    resultados: {
                        where: { situacao: { not: "CANCELADO" } },
                        orderBy: { id: "desc" },
                        take: 1,
                        select: { situacao: true, dataSorteio: true },
                    },
                },
            });
            const contagens = await this.prisma.ticket.groupBy({
                by: ["edicao"],
                where: { campanhaId },
                _count: { _all: true },
            });
            const ticketsPorEdicao = new Map(contagens.map((c) => [c.edicao, c._count._all]));

            return sorteios.map((sorteio) => ({
                edicao: sorteio.edicao,
                dataInicio: sorteio.dataInicioEdicao,
                dataFim: sorteio.dataFimEdicao,
                valorPorTicket: decimalParaNumero(sorteio.valorPorTicketEdicao),
                totalTickets: ticketsPorEdicao.get(sorteio.edicao) ?? 0,
                sorteioId: sorteio.id,
                situacaoResultado: sorteio.resultados[0]?.situacao ?? null,
                dataSorteio: sorteio.resultados[0]?.dataSorteio ?? null,
            }));
        } catch {
            throw new ErroAplicacao("Erro ao listar edicoes da campanha", 500);
        }
    }

    /**
     * Só exclui campanha sem histórico (NFC-e, tickets, resultados); remove o
     * sorteio automático vazio na mesma transação.
     */
    /**
     * Sem `forcar`, campanha com histórico é bloqueada (409, com contagens).
     * Com `forcar`, apaga todo o histórico de todas as edições na mesma transação.
     */
    async deletar(id: number, forcar = false): Promise<void> {
        try {
            await this.prisma.$transaction(async (tx) => {
                await this.travar(tx, id);
                const [tickets, processamentos, resultados] = await Promise.all([
                    tx.ticket.count({ where: { campanhaId: id } }),
                    tx.processamentoNfce.count({ where: { campanhaId: id } }),
                    tx.resultadoSorteio.count({ where: { sorteio: { campanhaId: id } } }),
                ]);
                const historico = { totalTickets: tickets, totalNotas: processamentos, totalResultados: resultados };
                if (!forcar && tickets > 0) {
                    throw new ErroAplicacao("Campanha com tickets; confirme a exclusao definitiva", 409, {
                        codigo: "CAMPANHA_COM_TICKETS",
                        ...historico,
                    });
                }
                if (!forcar && (processamentos > 0 || resultados > 0)) {
                    throw new ErroAplicacao("Campanha com historico; confirme a exclusao definitiva", 409, {
                        codigo: "CAMPANHA_COM_HISTORICO",
                        ...historico,
                    });
                }
                await tx.resultadoSorteio.deleteMany({ where: { sorteio: { campanhaId: id } } });
                await tx.ticket.deleteMany({ where: { campanhaId: id } });
                await tx.processamentoNfce.deleteMany({ where: { campanhaId: id } });
                await tx.residualTicketCampanha.deleteMany({ where: { campanhaId: id } });
                await tx.sorteio.deleteMany({ where: { campanhaId: id } });
                await tx.campanha.delete({ where: { id } });
            });
        } catch (erro) {
            if (erro instanceof ErroAplicacao) {
                throw erro;
            }
            if (ehViolacaoChaveEstrangeira(erro)) {
                throw new ErroAplicacao("Campanha com historico nao pode ser excluida; inative-a", 409, {
                    codigo: "CAMPANHA_COM_HISTORICO",
                });
            }
            throw new ErroAplicacao("Erro ao deletar campanha", 500);
        }
    }

    private filtroSobreposicao(dataInicio: Date, dataFim: Date, ignorarId?: number) {
        return {
            ativa: true,
            dataInicio: { lte: dataFim },
            dataFim: { gte: dataInicio },
            ...(ignorarId !== undefined ? { id: { not: ignorarId } } : {}),
        };
    }

    /** SELECT ... FOR UPDATE na campanha e releitura dentro da transação. */
    private async travar(tx: Transacao, id: number): Promise<RegistroCampanha> {
        await tx.$executeRaw`SELECT id_campanha FROM campanha WHERE id_campanha = ${id} FOR UPDATE`;
        const atual = await tx.campanha.findUnique({ where: { id } });
        if (!atual) {
            throw new ErroAplicacao("Campanha nao encontrada", 404);
        }
        return atual;
    }

    private dadosSorteioDaEdicao(campanha: RegistroCampanha) {
        return snapshotSorteioEdicao(campanha);
    }

    private async resumoObrigatorio(id: number): Promise<ResumoCampanha> {
        const resumo = await this.buscarResumo(id);
        if (!resumo) {
            throw new ErroAplicacao("Campanha nao encontrada", 404);
        }
        return resumo;
    }

    private async resumir(lista: RegistroCampanha[]): Promise<ResumoCampanha[]> {
        if (lista.length === 0) {
            return [];
        }
        const ids = lista.map((item) => item.id);
        const [sorteios, contagens] = await Promise.all([
            this.prisma.sorteio.findMany({
                where: { campanhaId: { in: ids } },
                select: {
                    id: true,
                    campanhaId: true,
                    edicao: true,
                    resultados: {
                        where: { situacao: { not: "CANCELADO" } },
                        orderBy: { id: "desc" },
                        take: 1,
                        select: { situacao: true },
                    },
                },
            }),
            this.prisma.ticket.groupBy({
                by: ["campanhaId", "edicao"],
                where: { campanhaId: { in: ids } },
                _count: { _all: true },
            }),
        ]);
        const chave = (campanhaId: number, edicao: number) => `${campanhaId}:${edicao}`;
        const sorteioPorEdicao = new Map(sorteios.map((s) => [chave(s.campanhaId, s.edicao), s]));
        const ticketsPorEdicao = new Map(
            contagens.map((c) => [chave(c.campanhaId, c.edicao), c._count._all]),
        );

        return lista.map((item) => {
            const sorteio = sorteioPorEdicao.get(chave(item.id, item.edicao));
            return {
                campanha: this.paraDominio(item),
                totalTickets: ticketsPorEdicao.get(chave(item.id, item.edicao)) ?? 0,
                sorteioId: sorteio?.id ?? null,
                situacaoResultado: sorteio?.resultados[0]?.situacao ?? null,
            };
        });
    }

    private paraDominio(item: RegistroCampanha): Campanha {
        return new Campanha({
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            qrcode: item.qrcode,
            dataInicio: item.dataInicio,
            dataFim: item.dataFim,
            valorPorTicket: decimalParaNumero(item.valorPorTicket),
            ativa: item.ativa,
            edicao: item.edicao,
            associacaoId: item.associacaoId,
            dataCriacao: item.dataCriacao,
            dataAtualizacao: item.dataAtualizacao,
        });
    }
}
