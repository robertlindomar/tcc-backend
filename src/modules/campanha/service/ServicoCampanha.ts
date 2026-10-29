import { resolverAssociacaoLogada } from "../../../shared/authz/resolverAssociacaoLogada";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { civilNoFuso } from "../../../shared/tempo/fusoNegocio";
import { garantirDataNaoPassada } from "../../../shared/tempo/garantirDataNaoPassada";
import {
    interpretarDataFim,
    interpretarDataInicio,
} from "../../../shared/tempo/interpretarDataFim";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { DTOAtualizarCampanha } from "../dto/DTOAtualizarCampanha";
import { DTOCriarCampanha } from "../dto/DTOCriarCampanha";
import { DTOReativarCampanha } from "../dto/DTOReativarCampanha";
import { RespostaCampanha, RespostaEdicaoCampanha } from "../dtos/RespostaCampanha";
import {
    DadosAtualizarCampanha,
    EdicaoCampanha,
    RepositorioCampanha,
    ResumoCampanha,
} from "../repository/RepositorioCampanha";
import { normalizarNomeCampanha } from "../utils/normalizarNomeCampanha";
import { situacaoSorteioEdicao } from "../utils/situacaoSorteioEdicao";

function dataCivilIso(data: Date): string {
    const civil = civilNoFuso(data);
    return `${civil.ano}-${String(civil.mes).padStart(2, "0")}-${String(civil.dia).padStart(2, "0")}`;
}

export class ServicoCampanha {
    constructor(
        private readonly repositorioCampanha: RepositorioCampanha,
        private readonly repositorioAssociacao: RepositorioAssociacao,
        private readonly agora: () => Date = () => new Date(),
    ) {}

    async criar(usuarioId: number, request: DTOCriarCampanha): Promise<RespostaCampanha> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );

        const nome = this.validarNome(request.nome);
        const nomeNormalizado = normalizarNomeCampanha(nome);
        const descricao = this.validarTextoOpcional(request.descricao, "Descricao");
        const qrcode = this.validarTextoOpcional(request.qrcode, "Qrcode");
        const dataInicio = this.validarDataInicio(request.dataInicio);
        const dataFim = this.validarDataFim(request.dataFim);
        const valorPorTicket = this.validarValorPorTicket(request.valorPorTicket);
        garantirDataNaoPassada(dataInicio, "dataInicio", undefined, this.agora());
        garantirDataNaoPassada(dataFim, "dataFim", undefined, this.agora());
        this.validarPeriodo(dataInicio, dataFim);
        await this.garantirNomeLivre(associacaoId, nomeNormalizado);
        await this.garantirPeriodoLivre(dataInicio, dataFim);

        const criado = await this.repositorioCampanha.criarComSorteio({
            nome,
            nomeNormalizado,
            descricao,
            qrcode,
            dataInicio,
            dataFim,
            valorPorTicket,
            associacaoId,
        });

        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaCampanha[]> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const lista = await this.repositorioCampanha.listarResumoPorAssociacaoId(associacaoId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaCampanha> {
        const resumo = await this.obterDaAssociacaoLogada(usuarioId, idParam);
        return this.paraResposta(resumo);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarCampanha,
    ): Promise<RespostaCampanha> {
        const existente = (await this.obterDaAssociacaoLogada(usuarioId, idParam)).campanha;
        const agora = this.agora();

        const dados: DadosAtualizarCampanha = {};

        if (request.nome !== undefined) {
            dados.nome = this.validarNome(request.nome);
            dados.nomeNormalizado = normalizarNomeCampanha(dados.nome);
        }
        if (request.descricao !== undefined) {
            dados.descricao = this.validarTextoOpcional(request.descricao, "Descricao");
        }
        if (request.qrcode !== undefined) {
            dados.qrcode = this.validarTextoOpcional(request.qrcode, "Qrcode");
        }
        if (request.dataInicio !== undefined) {
            dados.dataInicio = this.validarDataInicio(request.dataInicio);
            garantirDataNaoPassada(dados.dataInicio, "dataInicio", existente.dataInicio, agora);
        }
        if (request.dataFim !== undefined) {
            dados.dataFim = this.validarDataFim(request.dataFim);
            garantirDataNaoPassada(dados.dataFim, "dataFim", existente.dataFim, agora);
        }
        if (request.valorPorTicket !== undefined) {
            dados.valorPorTicket = this.validarValorPorTicket(request.valorPorTicket);
        }

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        this.descartarCamposInalterados(dados, existente);

        if (dados.nomeNormalizado !== undefined) {
            await this.garantirNomeLivre(existente.associacaoId, dados.nomeNormalizado, existente.id);
        }
        const dataInicio = dados.dataInicio ?? existente.dataInicio;
        const dataFim = dados.dataFim ?? existente.dataFim;
        this.validarPeriodo(dataInicio, dataFim);
        await this.garantirPeriodoLivre(dataInicio, dataFim, existente.id);

        const atualizado = await this.repositorioCampanha.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async inativar(usuarioId: number, idParam: string): Promise<RespostaCampanha> {
        const { campanha } = await this.obterDaAssociacaoLogada(usuarioId, idParam);
        const atualizado = await this.repositorioCampanha.inativar(campanha.id);
        return this.paraResposta(atualizado);
    }

    /** Abre a próxima edição com novo período (tickets recomeçam do 1). */
    async reativar(
        usuarioId: number,
        idParam: string,
        request: DTOReativarCampanha,
    ): Promise<RespostaCampanha> {
        const { campanha } = await this.obterDaAssociacaoLogada(usuarioId, idParam);
        const agora = this.agora();
        const corpo = (request ?? {}) as Partial<DTOReativarCampanha>;

        const dataInicio = this.validarDataInicio(corpo.dataInicio);
        const dataFim = this.validarDataFim(corpo.dataFim);
        const valorPorTicket =
            corpo.valorPorTicket === undefined || corpo.valorPorTicket === null
                ? undefined
                : this.validarValorPorTicket(corpo.valorPorTicket);
        garantirDataNaoPassada(dataInicio, "dataInicio", undefined, agora);
        garantirDataNaoPassada(dataFim, "dataFim", undefined, agora);
        this.validarPeriodo(dataInicio, dataFim);

        if (campanha.ativa) {
            throw new ErroAplicacao("Inative a campanha antes de reativar", 409, {
                codigo: "CAMPANHA_JA_ATIVA",
            });
        }

        const reativada = await this.repositorioCampanha.reativar(
            campanha.id,
            { dataInicio, dataFim, valorPorTicket },
            agora,
        );
        return this.paraResposta(reativada);
    }

    async listarEdicoes(usuarioId: number, idParam: string): Promise<RespostaEdicaoCampanha[]> {
        const { campanha } = await this.obterDaAssociacaoLogada(usuarioId, idParam);
        const edicoes = await this.repositorioCampanha.listarEdicoes(campanha.id);
        return edicoes.map((edicao) => this.paraRespostaEdicao(edicao, campanha.edicao));
    }

    async deletar(usuarioId: number, idParam: string, forcar = false): Promise<void> {
        const { campanha } = await this.obterDaAssociacaoLogada(usuarioId, idParam);
        await this.repositorioCampanha.deletar(campanha.id, forcar);
    }

    private async obterDaAssociacaoLogada(
        usuarioId: number,
        idParam: string,
    ): Promise<ResumoCampanha> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const id = this.parseId(idParam);
        const resumo = await this.repositorioCampanha.buscarResumo(id);

        if (!resumo || resumo.campanha.associacaoId !== associacaoId) {
            throw new ErroAplicacao("Campanha nao encontrada", 404);
        }

        return resumo;
    }

    /** Evita bloquear (edição em uso) quando o front reenvia o mesmo período/valor. */
    private descartarCamposInalterados(
        dados: DadosAtualizarCampanha,
        existente: ResumoCampanha["campanha"],
    ): void {
        if (dados.dataInicio?.getTime() === existente.dataInicio.getTime()) {
            delete dados.dataInicio;
        }
        if (dados.dataFim?.getTime() === existente.dataFim.getTime()) {
            delete dados.dataFim;
        }
        if (dados.valorPorTicket === existente.valorPorTicket) {
            delete dados.valorPorTicket;
        }
    }

    private paraResposta(resumo: ResumoCampanha): RespostaCampanha {
        const { campanha } = resumo;
        const periodoEncerrado = this.agora().getTime() > campanha.dataFim.getTime();
        return {
            id: campanha.id,
            nome: campanha.nome,
            descricao: campanha.descricao,
            qrcode: campanha.qrcode,
            dataInicio: campanha.dataInicio,
            dataFim: campanha.dataFim,
            dataInicioCivil: dataCivilIso(campanha.dataInicio),
            dataFimCivil: dataCivilIso(campanha.dataFim),
            valorPorTicket: campanha.valorPorTicket,
            associacaoId: campanha.associacaoId,
            dataCriacao: campanha.dataCriacao,
            dataAtualizacao: campanha.dataAtualizacao,
            ativa: campanha.ativa,
            edicao: campanha.edicao,
            totalTickets: resumo.totalTickets,
            sorteioId: resumo.sorteioId,
            periodoEncerrado,
            situacaoSorteio: situacaoSorteioEdicao({
                periodoEncerrado,
                totalTickets: resumo.totalTickets,
                situacaoResultado: resumo.situacaoResultado,
            }),
        };
    }

    private paraRespostaEdicao(edicao: EdicaoCampanha, edicaoAtual: number): RespostaEdicaoCampanha {
        const periodoEncerrado = this.agora().getTime() > edicao.dataFim.getTime();
        return {
            edicao: edicao.edicao,
            atual: edicao.edicao === edicaoAtual,
            dataInicio: edicao.dataInicio,
            dataFim: edicao.dataFim,
            dataInicioCivil: dataCivilIso(edicao.dataInicio),
            dataFimCivil: dataCivilIso(edicao.dataFim),
            valorPorTicket: edicao.valorPorTicket,
            totalTickets: edicao.totalTickets,
            sorteioId: edicao.sorteioId,
            periodoEncerrado,
            situacaoSorteio: situacaoSorteioEdicao({
                periodoEncerrado,
                totalTickets: edicao.totalTickets,
                situacaoResultado: edicao.situacaoResultado,
            }),
            dataSorteio: edicao.dataSorteio,
        };
    }

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome da campanha e obrigatorio", 400);
        }
        const limpo = nome.trim().replace(/\s+/g, " ");
        if (limpo.length > 255) {
            throw new ErroAplicacao("Nome da campanha deve ter no maximo 255 caracteres", 400);
        }
        return limpo;
    }

    private validarTextoOpcional(valor: unknown, rotulo: string): string | null {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }
        if (typeof valor !== "string") {
            throw new ErroAplicacao(`${rotulo} da campanha invalido`, 400);
        }
        return valor.trim() || null;
    }

    private validarDataInicio(valor: unknown): Date {
        try {
            return interpretarDataInicio(valor);
        } catch {
            throw new ErroAplicacao("Data de inicio da campanha invalida", 400);
        }
    }

    private validarDataFim(valor: unknown): Date {
        try {
            return interpretarDataFim(valor);
        } catch {
            throw new ErroAplicacao("Data de fim da campanha invalida", 400);
        }
    }

    private validarValorPorTicket(valor: unknown): number {
        const n = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isFinite(n) || n <= 0) {
            throw new ErroAplicacao("Valor por ticket deve ser maior que zero", 400);
        }
        return Math.round(n * 100) / 100;
    }

    private validarPeriodo(dataInicio: Date, dataFim: Date): void {
        if (dataFim.getTime() < dataInicio.getTime()) {
            throw new ErroAplicacao("Data de fim deve ser maior ou igual a data de inicio", 400);
        }
    }

    private async garantirNomeLivre(
        associacaoId: number,
        nomeNormalizado: string,
        ignorarId?: number,
    ): Promise<void> {
        const existente = await this.repositorioCampanha.buscarPorNomeNormalizado(
            associacaoId,
            nomeNormalizado,
            ignorarId,
        );
        if (existente) {
            throw new ErroAplicacao(`Ja existe a campanha "${existente.nome}" com esse nome`, 409, {
                codigo: "CAMPANHA_NOME_DUPLICADO",
                campanhaConflitanteId: existente.id,
            });
        }
    }

    /** Regra: só uma campanha ATIVA por período (sem sobreposição de datas). */
    private async garantirPeriodoLivre(
        dataInicio: Date,
        dataFim: Date,
        ignorarId?: number,
    ): Promise<void> {
        const conflito = await this.repositorioCampanha.buscarSobrepostaAoPeriodo(
            dataInicio,
            dataFim,
            ignorarId,
        );
        if (conflito) {
            throw new ErroAplicacao(
                `Ja existe a campanha "${conflito.nome}" nesse periodo`,
                409,
                { codigo: "CAMPANHA_PERIODO_OCUPADO", campanhaConflitanteId: conflito.id },
            );
        }
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da campanha invalido", 400);
        }
        return id;
    }
}
