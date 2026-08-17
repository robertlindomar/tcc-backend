import { FrequenciaMissao } from "../../../generated/prisma/enums";
import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { missaoEstaExpirada } from "../../../shared/tempo/calcularChavePeriodoMissao";
import { civilNoFuso } from "../../../shared/tempo/fusoNegocio";
import { interpretarDataFim } from "../../../shared/tempo/interpretarDataFim";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioMissaoConsumidor } from "../../missao-consumidor/repository/RepositorioMissaoConsumidor";
import { DTOAtualizarMissao } from "../dto/DTOAtualizarMissao";
import { DTOCriarMissao } from "../dto/DTOCriarMissao";
import { RespostaMissao } from "../dtos/RespostaMissao";
import { Missao } from "../model/Missao";
import { RepositorioMissao } from "../repository/RepositorioMissao";

const FREQUENCIAS = new Set<string>(Object.values(FrequenciaMissao));

function dataCivilIso(dataFim: Date | null): string | null {
    if (!dataFim) {
        return null;
    }
    const civil = civilNoFuso(dataFim);
    return `${civil.ano}-${String(civil.mes).padStart(2, "0")}-${String(civil.dia).padStart(2, "0")}`;
}

export class ServicoMissao {
    constructor(
        private readonly repositorioMissao: RepositorioMissao,
        private readonly repositorioLojista: RepositorioLojista,
        private readonly repositorioMissaoConsumidor: RepositorioMissaoConsumidor,
    ) {}

    async criar(usuarioId: number, request: DTOCriarMissao): Promise<RespostaMissao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );

        const nome = this.validarNome(request.nome);
        const descricao = this.validarDescricaoOpcional(request.descricao);
        const pontoRecompensa = this.validarPontoRecompensa(request.pontoRecompensa);
        const frequencia = this.validarFrequencia(request.frequencia);
        const dataFim = this.validarDataFimObrigatoria(request.dataFim);

        const criado = await this.repositorioMissao.criar({
            nome,
            descricao,
            pontoRecompensa,
            frequencia,
            dataFim,
            lojistaId,
        });

        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaMissao[]> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const lista = await this.repositorioMissao.listarPorLojistaId(lojistaId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaMissao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const missao = await this.obterDoLojista(idParam, lojistaId);
        return this.paraResposta(missao);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarMissao,
    ): Promise<RespostaMissao> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        if (existente.sistema) {
            throw new ErroAplicacao(
                "Esta missao e obrigatoria e nao pode ser alterada",
                409,
            );
        }

        const dados: {
            nome?: string;
            descricao?: string | null;
            pontoRecompensa?: number;
            frequencia?: FrequenciaMissao;
            dataFim?: Date;
        } = {};

        if (request.nome !== undefined) {
            dados.nome = this.validarNome(request.nome);
        }
        if (request.descricao !== undefined) {
            dados.descricao = this.validarDescricaoOpcional(request.descricao);
        }
        if (request.pontoRecompensa !== undefined) {
            dados.pontoRecompensa = this.validarPontoRecompensa(request.pontoRecompensa);
        }
        if (request.frequencia !== undefined) {
            const frequencia = this.validarFrequencia(request.frequencia);
            if (frequencia !== existente.frequencia) {
                const conclusoes =
                    await this.repositorioMissaoConsumidor.contarPorMissaoId(existente.id);
                if (conclusoes > 0) {
                    throw new ErroAplicacao(
                        "Nao e permitido alterar a frequencia apos conclusoes",
                        409,
                    );
                }
            }
            dados.frequencia = frequencia;
        }
        if (request.dataFim !== undefined) {
            dados.dataFim = this.validarDataFimObrigatoria(request.dataFim);
        } else if (!existente.dataFim) {
            throw new ErroAplicacao("dataFim e obrigatoria", 400);
        }

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        const atualizado = await this.repositorioMissao.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioId,
        );
        const existente = await this.obterDoLojista(idParam, lojistaId);
        if (existente.sistema) {
            throw new ErroAplicacao(
                "Esta missão é obrigatória e não pode ser excluída.",
                409,
            );
        }
        await this.repositorioMissao.deletar(existente.id);
    }

    private async obterDoLojista(idParam: string, lojistaId: number): Promise<Missao> {
        const id = this.parseId(idParam);
        const missao = await this.repositorioMissao.buscar(id);

        if (!missao || missao.lojistaId !== lojistaId) {
            throw new ErroAplicacao("Missao nao encontrada", 404);
        }

        return missao;
    }

    private paraResposta(missao: Missao, agora: Date = new Date()): RespostaMissao {
        return {
            id: missao.id,
            nome: missao.nome,
            descricao: missao.descricao,
            pontoRecompensa: missao.pontoRecompensa,
            frequencia: missao.frequencia,
            dataFim: missao.dataFim,
            dataFimCivil: dataCivilIso(missao.dataFim),
            expirada: missaoEstaExpirada(missao.dataFim, agora),
            sistema: missao.sistema,
            lojistaId: missao.lojistaId,
            tokenQr: missao.tokenQr,
            dataCriacao: missao.dataCriacao,
            dataAtualizacao: missao.dataAtualizacao,
        };
    }

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome da missao e obrigatorio", 400);
        }
        return nome.trim();
    }

    private validarDescricaoOpcional(descricao: unknown): string | null {
        if (descricao === undefined || descricao === null || descricao === "") {
            return null;
        }
        if (typeof descricao !== "string") {
            throw new ErroAplicacao("Descricao da missao invalida", 400);
        }
        return descricao.trim() || null;
    }

    private validarPontoRecompensa(valor: unknown): number {
        if (valor === undefined || valor === null || valor === "") {
            throw new ErroAplicacao("pontoRecompensa e obrigatorio", 400);
        }
        const n = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(n) || n < 1) {
            throw new ErroAplicacao("pontoRecompensa deve ser um inteiro maior que zero", 400);
        }
        return n;
    }

    private validarFrequencia(valor: unknown): FrequenciaMissao {
        if (typeof valor !== "string" || !FREQUENCIAS.has(valor)) {
            throw new ErroAplicacao("frequencia invalida", 400);
        }
        return valor as FrequenciaMissao;
    }

    private validarDataFimObrigatoria(valor: unknown): Date {
        if (valor === undefined || valor === null || valor === "") {
            throw new ErroAplicacao("dataFim e obrigatoria", 400);
        }
        try {
            return interpretarDataFim(valor);
        } catch {
            throw new ErroAplicacao("dataFim invalida", 400);
        }
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da missao invalido", 400);
        }
        return id;
    }
}
