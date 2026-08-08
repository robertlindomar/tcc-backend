import { resolverAssociacaoLogada } from "../../../shared/authz/resolverAssociacaoLogada";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioCampanha } from "../../campanha/repository/RepositorioCampanha";
import { DTOAtualizarSorteio } from "../dto/DTOAtualizarSorteio";
import { DTOCriarSorteio } from "../dto/DTOCriarSorteio";
import { RespostaSorteio } from "../dtos/RespostaSorteio";
import { Sorteio } from "../model/Sorteio";
import { RepositorioSorteio } from "../repository/RepositorioSorteio";

export class ServicoSorteio {
    constructor(
        private readonly repositorioSorteio: RepositorioSorteio,
        private readonly repositorioCampanha: RepositorioCampanha,
        private readonly repositorioAssociacao: RepositorioAssociacao,
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
        await this.repositorioSorteio.deletar(existente.id);
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
        return {
            id: sorteio.id,
            qrcode: sorteio.qrcode,
            campanhaId: sorteio.campanhaId,
            dataCriacao: sorteio.dataCriacao,
            dataAtualizacao: sorteio.dataAtualizacao,
        };
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
