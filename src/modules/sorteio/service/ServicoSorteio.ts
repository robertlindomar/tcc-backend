import { calcularDataLimiteSorteio, prazoSorteioEncerrado } from "../utils/prazoSorteio";
import { resolverAssociacaoLogada } from "../../../shared/authz/resolverAssociacaoLogada";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioCampanha } from "../../campanha/repository/RepositorioCampanha";
import { DTOAtualizarSorteio } from "../dto/DTOAtualizarSorteio";
import { DTOCriarSorteio } from "../dto/DTOCriarSorteio";
import { RespostaResultadoSorteio, RespostaSorteio } from "../dtos/RespostaSorteio";
import { ResultadoSorteio, Sorteio } from "../model/Sorteio";
import { RepositorioSorteio } from "../repository/RepositorioSorteio";
import { SortearNumero, sortearNumeroAleatorio } from "../utils/sortearNumero";

export class ServicoSorteio {
    constructor(
        private readonly repositorioSorteio: RepositorioSorteio,
        private readonly repositorioCampanha: RepositorioCampanha,
        private readonly repositorioAssociacao: RepositorioAssociacao,
        private readonly sortearNumero: SortearNumero = sortearNumeroAleatorio,
        private readonly agora: () => Date = () => new Date(),
    ) {}

    async criar(usuarioId: number, request: DTOCriarSorteio): Promise<RespostaSorteio> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );

        const campanhaId = await this.validarCampanhaDaAssociacao(
            request.campanhaId,
            associacaoId,
        );
        const qrcode = this.validarQrcodeOpcional(request.qrcode);

        const criado = await this.repositorioSorteio.criar({ campanhaId, qrcode });
        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaSorteio[]> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const lista = await this.repositorioSorteio.listarPorAssociacaoId(associacaoId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaSorteio> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const sorteio = await this.obterDaAssociacao(idParam, associacaoId);
        return this.paraResposta(sorteio);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarSorteio,
    ): Promise<RespostaSorteio> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const existente = await this.obterDaAssociacao(idParam, associacaoId);

        const dados: {
            campanhaId?: number;
            qrcode?: string | null;
        } = {};

        if (request.campanhaId !== undefined) {
            dados.campanhaId = await this.validarCampanhaDaAssociacao(
                request.campanhaId,
                associacaoId,
            );
            if (dados.campanhaId !== existente.campanhaId && existente.resultados.length > 0) {
                throw new ErroAplicacao("Sorteio ja realizado nao pode trocar de campanha", 409);
            }
        }
        if (request.qrcode !== undefined) {
            dados.qrcode = this.validarQrcodeOpcional(request.qrcode);
        }

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        const atualizado = await this.repositorioSorteio.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const existente = await this.obterDaAssociacao(idParam, associacaoId);
        if (existente.resultados.length > 0) {
            throw new ErroAplicacao("Sorteio ja realizado nao pode ser excluido", 409);
        }
        await this.repositorioSorteio.deletar(existente.id);
    }

    /** G17: sorteia 1..N tickets da campanha encerrada. */
    async sortear(usuarioId: number, idParam: string): Promise<RespostaSorteio> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const sorteio = await this.obterDaAssociacao(idParam, associacaoId);
        if (sorteio.resultadoAtual) {
            throw new ErroAplicacao("Sorteio ja possui resultado ativo", 409, {
                codigo: "SORTEIO_JA_REALIZADO",
            });
        }
        await this.realizarSorteio(sorteio);
        return this.recarregar(sorteio.id);
    }

    /** G17: vencedor não apareceu → cancela o resultado pendente e sorteia de novo. */
    async refazer(usuarioId: number, idParam: string): Promise<RespostaSorteio> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const sorteio = await this.obterDaAssociacao(idParam, associacaoId);
        const atual = sorteio.resultadoAtual;
        if (!atual) {
            throw new ErroAplicacao("Sorteio ainda nao realizado", 409, {
                codigo: "SORTEIO_NAO_REALIZADO",
            });
        }
        if (atual.situacao === "ENTREGUE") {
            throw new ErroAplicacao("Premio ja entregue; sorteio nao pode ser refeito", 409, {
                codigo: "PREMIO_JA_ENTREGUE",
            });
        }
        if (!prazoSorteioEncerrado(atual.dataSorteio, this.agora())) {
            throw new ErroAplicacao("O ganhador ainda esta no prazo de sete dias", 409, { codigo: "PRAZO_RETIRADA_NAO_ENCERRADO" });
        }
        await this.realizarSorteio(sorteio, atual);
        return this.recarregar(sorteio.id);
    }

    async confirmarEntrega(usuarioId: number, idParam: string): Promise<RespostaSorteio> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const sorteio = await this.obterDaAssociacao(idParam, associacaoId);
        const atual = sorteio.resultadoAtual;
        if (!atual) {
            throw new ErroAplicacao("Sorteio ainda nao realizado", 409, {
                codigo: "SORTEIO_NAO_REALIZADO",
            });
        }
        if (atual.situacao === "AGUARDANDO_ENTREGA") {
            if (prazoSorteioEncerrado(atual.dataSorteio, this.agora())) {
                throw new ErroAplicacao("Prazo de retirada encerrado; refaca o sorteio", 409, { codigo: "PRAZO_RETIRADA_ENCERRADO" });
            }
            if (!atual.dataConfirmacaoLeitura) {
                throw new ErroAplicacao("O ganhador precisa confirmar que viu o resultado no aplicativo", 409, { codigo: "LEITURA_NAO_CONFIRMADA" });
            }
            const confirmado = await this.repositorioSorteio.confirmarEntrega(atual.id, this.agora());
            if (!confirmado) {
                throw new ErroAplicacao("Resultado do sorteio mudou; recarregue", 409);
            }
        }
        return this.recarregar(sorteio.id);
    }

    private async realizarSorteio(
        sorteio: Sorteio,
        resultadoACancelar?: ResultadoSorteio,
    ): Promise<void> {
        if (this.agora().getTime() <= sorteio.dataFimCampanha.getTime()) {
            throw new ErroAplicacao("Campanha ainda nao terminou", 409, {
                codigo: "CAMPANHA_NAO_ENCERRADA",
            });
        }

        const total = sorteio.totalTickets;
        const numerosCancelados = new Set(
            sorteio.resultados
                .filter((item) => item.situacao === "CANCELADO")
                .map((item) => item.numeroSorteado),
        );
        if (resultadoACancelar) {
            numerosCancelados.add(resultadoACancelar.numeroSorteado);
        }
        if (total - numerosCancelados.size <= 0) {
            throw new ErroAplicacao("Campanha sem tickets elegiveis para sorteio", 409, {
                codigo: "SEM_TICKETS",
            });
        }

        let numero = this.sortearNumero(1, total);
        while (numerosCancelados.has(numero)) {
            numero = this.sortearNumero(1, total);
        }

        const ticketId = await this.repositorioSorteio.buscarTicketIdPorNumero(
            sorteio.campanhaId,
            numero,
        );
        if (ticketId === null) {
            throw new ErroAplicacao("Ticket sorteado nao encontrado", 500);
        }

        await this.repositorioSorteio.registrarResultado({
            sorteioId: sorteio.id,
            ticketId,
            numeroSorteado: numero,
            totalTickets: total,
            cancelarResultadoId: resultadoACancelar?.id,
            agora: this.agora(),
        });
    }

    private async recarregar(id: number): Promise<RespostaSorteio> {
        const sorteio = await this.repositorioSorteio.buscar(id);
        if (!sorteio) {
            throw new ErroAplicacao("Sorteio nao encontrado", 404);
        }
        return this.paraResposta(sorteio);
    }

    private async obterDaAssociacao(
        idParam: string,
        associacaoId: number,
    ): Promise<Sorteio> {
        const id = this.parseId(idParam, "sorteio");
        const sorteio = await this.repositorioSorteio.buscar(id);

        if (!sorteio) {
            throw new ErroAplicacao("Sorteio nao encontrado", 404);
        }

        const campanha = await this.repositorioCampanha.buscar(sorteio.campanhaId);
        if (!campanha || campanha.associacaoId !== associacaoId) {
            throw new ErroAplicacao("Sorteio nao encontrado", 404);
        }

        return sorteio;
    }

    private async validarCampanhaDaAssociacao(
        campanhaIdRaw: unknown,
        associacaoId: number,
    ): Promise<number> {
        const campanhaId =
            typeof campanhaIdRaw === "number" ? campanhaIdRaw : Number(campanhaIdRaw);

        if (!Number.isInteger(campanhaId) || campanhaId <= 0) {
            throw new ErroAplicacao("campanhaId invalido", 400);
        }

        const campanha = await this.repositorioCampanha.buscar(campanhaId);
        if (!campanha || campanha.associacaoId !== associacaoId) {
            throw new ErroAplicacao("Campanha nao encontrada", 404);
        }

        return campanhaId;
    }

    private paraResposta(sorteio: Sorteio): RespostaSorteio {
        const atual = sorteio.resultadoAtual;
        return {
            id: sorteio.id,
            qrcode: sorteio.qrcode,
            campanhaId: sorteio.campanhaId,
            totalTickets: sorteio.totalTickets,
            campanhaEncerrada: this.agora().getTime() > sorteio.dataFimCampanha.getTime(),
            resultadoAtual: atual ? this.paraRespostaResultado(atual) : null,
            historico: sorteio.resultados.map((item) => this.paraRespostaResultado(item)),
            dataCriacao: sorteio.dataCriacao,
            dataAtualizacao: sorteio.dataAtualizacao,
        };
    }

    private paraRespostaResultado(resultado: ResultadoSorteio): RespostaResultadoSorteio {
        return {
            id: resultado.id,
            numeroSorteado: resultado.numeroSorteado,
            totalTickets: resultado.totalTickets,
            situacao: resultado.situacao,
            dataSorteio: resultado.dataSorteio,
            dataConfirmacaoLeitura: resultado.dataConfirmacaoLeitura ?? null,
            dataLimiteRetirada: calcularDataLimiteSorteio(resultado.dataSorteio),
            prazoEncerrado: prazoSorteioEncerrado(resultado.dataSorteio, this.agora()),
            dataAtualizacao: resultado.dataAtualizacao,
            vencedor: {
                consumidorId: resultado.vencedor.consumidorId,
                nome: resultado.vencedor.nome,
                email: resultado.vencedor.email,
                cpfMascarado: this.mascararCpf(resultado.vencedor.cpf),
            },
        };
    }

    private mascararCpf(cpf: string): string {
        const digitos = cpf.replace(/\D/g, "");
        if (digitos.length !== 11) {
            return "***";
        }
        return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
    }

    private validarQrcodeOpcional(valor: unknown): string | null {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }
        if (typeof valor !== "string") {
            throw new ErroAplicacao("Qrcode do sorteio invalido", 400);
        }
        return valor.trim() || null;
    }

    private parseId(idParam: string, rotulo: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao(`ID do ${rotulo} invalido`, 400);
        }
        return id;
    }
}
