import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { DTOAtualizarLojista } from "../dto/DTOAtualizarLojista";
import { DTOCriarLojista } from "../dto/DTOCriarLojista";
import { RespostaLojista } from "../dtos/RespostaLojista";
import { Lojista } from "../model/Lojista";
import { RepositorioLojista } from "../repository/RepositorioLojista";

const STATUS_VALIDOS = Object.values(StatusLojista);

type UsuarioAutenticado = {
    id: number;
    role: Role;
};

export class ServicoLojista {
    constructor(
        private readonly repositorioLojista: RepositorioLojista,
        private readonly repositorioUsuario: RepositorioUsuario,
        private readonly repositorioAssociacao: RepositorioAssociacao,
        private readonly repositorioEndereco: RepositorioEndereco,
    ) {}

    async criar(usuarioId: number, request: DTOCriarLojista): Promise<RespostaLojista> {
        const nomeFantasia = this.validarTextoObrigatorio(
            request.nomeFantasia,
            "Nome fantasia",
        );
        const razaoSocial = this.validarTextoObrigatorio(request.razaoSocial, "Razao social");
        const cnpj = this.validarTextoObrigatorio(request.cnpj, "CNPJ");
        const associacaoId = this.validarIdNumerico(request.associacaoId, "associacaoId");
        const inscricaoEstadual = this.validarInscricaoEstadual(request.inscricaoEstadual);
        const enderecoId = await this.resolverEnderecoId(usuarioId, request.enderecoId, false);

        const usuario = await this.repositorioUsuario.buscar(usuarioId);
        if (!usuario) {
            throw new ErroAplicacao("Usuario nao encontrado", 404);
        }
        if (usuario.role !== Role.LOJISTA) {
            throw new ErroAplicacao("Usuario deve ter role LOJISTA", 400);
        }

        const associacao = await this.repositorioAssociacao.buscar(associacaoId);
        if (!associacao) {
            throw new ErroAplicacao("Associacao nao encontrada", 404);
        }

        const perfilExistente = await this.repositorioLojista.buscarPorUsuarioId(usuarioId);
        if (perfilExistente) {
            throw new ErroAplicacao("Usuario ja possui perfil de lojista", 400);
        }

        const cnpjExistente = await this.repositorioLojista.buscarPorCnpj(cnpj);
        if (cnpjExistente) {
            throw new ErroAplicacao("CNPJ ja cadastrado", 400);
        }

        const criado = await this.repositorioLojista.criar({
            nomeFantasia,
            razaoSocial,
            cnpj,
            inscricaoEstadual,
            status: StatusLojista.PENDENTE,
            usuarioId,
            associacaoId,
            enderecoId,
        });

        return this.paraResposta(criado);
    }

    async listar(
        usuarioLogado: UsuarioAutenticado,
        statusQuery?: string,
    ): Promise<RespostaLojista[]> {
        const status = this.parseStatusOpcional(statusQuery);

        if (usuarioLogado.role === Role.ASSOCIACAO) {
            const associacao = await this.repositorioAssociacao.buscarPorUsuarioId(
                usuarioLogado.id,
            );
            if (!associacao) {
                throw new ErroAplicacao(
                    "Associacao nao encontrada para o usuario logado",
                    404,
                );
            }
            const lista = await this.repositorioLojista.listarPorAssociacaoId(
                associacao.id,
                status,
            );
            return lista.map((item) => this.paraResposta(item));
        }

        if (usuarioLogado.role === Role.LOJISTA) {
            const proprio = await this.repositorioLojista.buscarPorUsuarioId(
                usuarioLogado.id,
            );
            if (!proprio) {
                return [];
            }
            if (status && proprio.status !== status) {
                return [];
            }
            return [this.paraResposta(proprio)];
        }

        throw new ErroAplicacao("Acesso nao autorizado para este perfil", 403);
    }

    async buscar(idParam: string): Promise<RespostaLojista> {
        const id = this.parseId(idParam);
        const lojista = await this.repositorioLojista.buscar(id);

        if (!lojista) {
            throw new ErroAplicacao("Lojista nao encontrado", 404);
        }

        return this.paraResposta(lojista);
    }

    async atualizar(
        idParam: string,
        usuarioLogado: UsuarioAutenticado,
        request: DTOAtualizarLojista,
    ): Promise<RespostaLojista> {
        const id = this.parseId(idParam);
        const existente = await this.repositorioLojista.buscar(id);

        if (!existente) {
            throw new ErroAplicacao("Lojista nao encontrado", 404);
        }

        await this.garantirDonoOuAssociacaoGestora(existente, usuarioLogado);

        const nomeFantasia = this.validarTextoObrigatorio(
            request.nomeFantasia,
            "Nome fantasia",
        );
        const razaoSocial = this.validarTextoObrigatorio(request.razaoSocial, "Razao social");
        const cnpj = this.validarTextoObrigatorio(request.cnpj, "CNPJ");
        const inscricaoEstadual = this.validarInscricaoEstadual(request.inscricaoEstadual);

        if (cnpj !== existente.cnpj) {
            const cnpjExistente = await this.repositorioLojista.buscarPorCnpj(cnpj);
            if (cnpjExistente) {
                throw new ErroAplicacao("CNPJ ja cadastrado", 400);
            }
        }

        const dadosAtualizacao: {
            nomeFantasia: string;
            razaoSocial: string;
            cnpj: string;
            inscricaoEstadual: number | null;
            enderecoId?: number | null;
        } = {
            nomeFantasia,
            razaoSocial,
            cnpj,
            inscricaoEstadual,
        };

        if (request.enderecoId !== undefined) {
            dadosAtualizacao.enderecoId = await this.resolverEnderecoId(
                existente.usuarioId,
                request.enderecoId,
                true,
            );
        }

        const atualizado = await this.repositorioLojista.atualizar(id, dadosAtualizacao);

        return this.paraResposta(atualizado);
    }

    async aprovar(idParam: string, usuarioLogadoId: number): Promise<RespostaLojista> {
        return this.alterarStatus(
            idParam,
            usuarioLogadoId,
            StatusLojista.APROVADO,
        );
    }

    async rejeitar(idParam: string, usuarioLogadoId: number): Promise<RespostaLojista> {
        return this.alterarStatus(
            idParam,
            usuarioLogadoId,
            StatusLojista.REJEITADO,
        );
    }

    async deletar(idParam: string, usuarioLogado: UsuarioAutenticado): Promise<void> {
        const id = this.parseId(idParam);
        const existente = await this.repositorioLojista.buscar(id);

        if (!existente) {
            throw new ErroAplicacao("Lojista nao encontrado", 404);
        }

        await this.garantirDonoOuAssociacaoGestora(existente, usuarioLogado);

        await this.repositorioLojista.deletar(id);
    }

    private async garantirDonoOuAssociacaoGestora(
        lojista: Lojista,
        usuarioLogado: UsuarioAutenticado,
    ): Promise<void> {
        if (lojista.usuarioId === usuarioLogado.id) {
            return;
        }

        if (usuarioLogado.role !== Role.ASSOCIACAO) {
            throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
        }

        const associacao = await this.repositorioAssociacao.buscarPorUsuarioId(
            usuarioLogado.id,
        );
        if (!associacao || lojista.associacaoId !== associacao.id) {
            throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
        }
    }

    private async alterarStatus(
        idParam: string,
        usuarioLogadoId: number,
        status: typeof StatusLojista.APROVADO | typeof StatusLojista.REJEITADO,
    ): Promise<RespostaLojista> {
        const id = this.parseId(idParam);
        const lojista = await this.repositorioLojista.buscar(id);

        if (!lojista) {
            throw new ErroAplicacao("Lojista nao encontrado", 404);
        }

        const associacao = await this.repositorioAssociacao.buscarPorUsuarioId(usuarioLogadoId);
        if (!associacao) {
            throw new ErroAplicacao("Associacao nao encontrada para o usuario logado", 404);
        }

        if (lojista.associacaoId !== associacao.id) {
            throw new ErroAplicacao("Lojista nao pertence a sua associacao", 403);
        }

        const atualizado = await this.repositorioLojista.atualizarStatus(id, status);
        return this.paraResposta(atualizado);
    }

    private paraResposta(lojista: Lojista): RespostaLojista {
        return {
            id: lojista.id,
            nomeFantasia: lojista.nomeFantasia,
            razaoSocial: lojista.razaoSocial,
            cnpj: lojista.cnpj,
            inscricaoEstadual: lojista.inscricaoEstadual,
            status: lojista.status,
            usuarioId: lojista.usuarioId,
            associacaoId: lojista.associacaoId,
            enderecoId: lojista.enderecoId,
            dataCriacao: lojista.dataCriacao,
            dataAtualizacao: lojista.dataAtualizacao,
        };
    }

    /**
     * @param permitirNullExplicito no update, `null` remove o vínculo; no create, `null`/omitido
     * tenta o endereço do usuário.
     */
    private async resolverEnderecoId(
        usuarioId: number,
        enderecoIdInformado: unknown,
        permitirNullExplicito: boolean,
    ): Promise<number | null> {
        if (enderecoIdInformado === undefined) {
            if (permitirNullExplicito) {
                return null;
            }
            const doUsuario = await this.repositorioEndereco.buscarPorUsuarioId(usuarioId);
            return doUsuario?.id ?? null;
        }

        if (enderecoIdInformado === null || enderecoIdInformado === "") {
            return null;
        }

        const id = this.validarIdNumerico(enderecoIdInformado, "enderecoId");
        const endereco = await this.repositorioEndereco.buscarPorId(id);
        if (!endereco) {
            throw new ErroAplicacao("Endereco nao encontrado", 404);
        }
        if (endereco.usuarioId !== usuarioId) {
            throw new ErroAplicacao("Endereco nao pertence ao usuario lojista", 403);
        }

        return id;
    }

    private parseStatusOpcional(statusQuery?: string): StatusLojista | undefined {
        if (statusQuery === undefined || statusQuery === "") {
            return undefined;
        }

        if (!STATUS_VALIDOS.includes(statusQuery as StatusLojista)) {
            throw new ErroAplicacao("Status invalido", 400);
        }

        return statusQuery as StatusLojista;
    }

    private validarTextoObrigatorio(valor: unknown, campo: string): string {
        if (typeof valor !== "string" || !valor.trim()) {
            throw new ErroAplicacao(`${campo} e obrigatorio`, 400);
        }
        return valor.trim();
    }

    private validarIdNumerico(valor: unknown, campo: string): number {
        const id = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao(`${campo} invalido`, 400);
        }
        return id;
    }

    private validarInscricaoEstadual(valor: unknown): number | null {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }

        const numero = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(numero) || numero < 0) {
            throw new ErroAplicacao("Inscricao estadual invalida", 400);
        }

        return numero;
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID do lojista invalido", 400);
        }
        return id;
    }
}
