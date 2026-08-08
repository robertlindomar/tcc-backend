import { resolverAssociacaoLogada } from "../../../shared/authz/resolverAssociacaoLogada";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { DTOAtualizarCampanha } from "../dto/DTOAtualizarCampanha";
import { DTOCriarCampanha } from "../dto/DTOCriarCampanha";
import { RespostaCampanha } from "../dtos/RespostaCampanha";
import { Campanha } from "../model/Campanha";
import { RepositorioCampanha } from "../repository/RepositorioCampanha";

export class ServicoCampanha {
    constructor(
        private readonly repositorioCampanha: RepositorioCampanha,
        private readonly repositorioAssociacao: RepositorioAssociacao,
    ) {}

    async criar(usuarioId: number, request: DTOCriarCampanha): Promise<RespostaCampanha> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );

        const nome = this.validarNome(request.nome);
        const descricao = this.validarTextoOpcional(request.descricao, "Descricao");
        const qrcode = this.validarTextoOpcional(request.qrcode, "Qrcode");

        const criado = await this.repositorioCampanha.criar({
            nome,
            descricao,
            qrcode,
            associacaoId,
        });

        return this.paraResposta(criado);
    }

    async listar(usuarioId: number): Promise<RespostaCampanha[]> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const lista = await this.repositorioCampanha.listarPorAssociacaoId(associacaoId);
        return lista.map((item) => this.paraResposta(item));
    }

    async buscar(usuarioId: number, idParam: string): Promise<RespostaCampanha> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const campanha = await this.obterDaAssociacao(idParam, associacaoId);
        return this.paraResposta(campanha);
    }

    async atualizar(
        usuarioId: number,
        idParam: string,
        request: DTOAtualizarCampanha,
    ): Promise<RespostaCampanha> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const existente = await this.obterDaAssociacao(idParam, associacaoId);

        const dados: {
            nome?: string;
            descricao?: string | null;
            qrcode?: string | null;
        } = {};

        if (request.nome !== undefined) {
            dados.nome = this.validarNome(request.nome);
        }
        if (request.descricao !== undefined) {
            dados.descricao = this.validarTextoOpcional(request.descricao, "Descricao");
        }
        if (request.qrcode !== undefined) {
            dados.qrcode = this.validarTextoOpcional(request.qrcode, "Qrcode");
        }

        if (Object.keys(dados).length === 0) {
            throw new ErroAplicacao("Nenhum campo para atualizar", 400);
        }

        const atualizado = await this.repositorioCampanha.atualizar(existente.id, dados);
        return this.paraResposta(atualizado);
    }

    async deletar(usuarioId: number, idParam: string): Promise<void> {
        const { associacaoId } = await resolverAssociacaoLogada(
            this.repositorioAssociacao,
            usuarioId,
        );
        const existente = await this.obterDaAssociacao(idParam, associacaoId);
        await this.repositorioCampanha.deletar(existente.id);
    }

    private async obterDaAssociacao(
        idParam: string,
        associacaoId: number,
    ): Promise<Campanha> {
        const id = this.parseId(idParam);
        const campanha = await this.repositorioCampanha.buscar(id);

        if (!campanha || campanha.associacaoId !== associacaoId) {
            throw new ErroAplicacao("Campanha nao encontrada", 404);
        }

        return campanha;
    }

    private paraResposta(campanha: Campanha): RespostaCampanha {
        return {
            id: campanha.id,
            nome: campanha.nome,
            descricao: campanha.descricao,
            qrcode: campanha.qrcode,
            associacaoId: campanha.associacaoId,
            dataCriacao: campanha.dataCriacao,
            dataAtualizacao: campanha.dataAtualizacao,
        };
    }

    private validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) {
            throw new ErroAplicacao("Nome da campanha e obrigatorio", 400);
        }
        return nome.trim();
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

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID da campanha invalido", 400);
        }
        return id;
    }
}
