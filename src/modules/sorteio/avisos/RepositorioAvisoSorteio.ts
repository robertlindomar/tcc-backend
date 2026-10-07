import { PRAZO_SORTEIO_MS } from "../utils/prazoSorteio";
import { PrismaClient } from "../../../generated/prisma/client";

const selecionarResultado = {
    id: true,
    numeroSorteado: true,
    situacao: true,
    dataSorteio: true,
    dataConfirmacaoLeitura: true,
    sorteio: { select: { id: true, campanha: { select: {
        id: true, nome: true, descricao: true,
        associacao: { select: { nomeFantasia: true } },
    } } } },
    ticket: { select: { consumidorId: true, consumidor: {
        select: { usuario: { select: { nome: true } } },
    } } },
};

export class RepositorioAvisoSorteio {
    constructor(private readonly prisma: PrismaClient) {}

    listarVisiveis(consumidorId: number) {
        return this.prisma.resultadoSorteio.findMany({
            where: {
                situacao: { not: "CANCELADO" },
                avisosOcultos: { none: { consumidorId } },
            },
            select: selecionarResultado,
            orderBy: { id: "desc" },
        });
    }

    buscar(resultadoId: number) {
        return this.prisma.resultadoSorteio.findUnique({
            where: { id: resultadoId }, select: selecionarResultado,
        });
    }

    async confirmarLeitura(resultadoId: number, consumidorId: number, agora: Date) {
        await this.prisma.resultadoSorteio.updateMany({
            where: {
                id: resultadoId, situacao: "AGUARDANDO_ENTREGA",
                ticket: { consumidorId }, dataConfirmacaoLeitura: null,
                dataSorteio: { gte: new Date(agora.getTime() - PRAZO_SORTEIO_MS) },
            },
            data: { dataConfirmacaoLeitura: agora },
        });
        return this.buscar(resultadoId);
    }

    async ocultar(resultadoId: number, consumidorId: number): Promise<void> {
        await this.prisma.avisoSorteioOculto.upsert({
            where: { resultadoId_consumidorId: { resultadoId, consumidorId } },
            create: { resultadoId, consumidorId }, update: {},
        });
    }
}
