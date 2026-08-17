import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { DTOAtualizarAssociacao } from "../dto/DTOAtualizarAssociacao";
import { DTOCriarAssociacao } from "../dto/DTOCriarAssociacao";
import { RespostaAssociacao } from "../dtos/RespostaAssociacao";
import { Associacao } from "../model/Associacao";
import { RepositorioAssociacao } from "../repository/RepositorioAssociacao";

type UsuarioAutenticado = {
    id: number;
    role: Role;
};

export class ServicoAssociacao {
    constructor(
        private readonly repositorioAssociacao: RepositorioAssociacao,
        private readonly repositorioUsuario: RepositorioUsuario,
        private readonly repositorioLojista: RepositorioLojista,
    ) {}

    async criar(
        usuarioId: number,
        request: DTOCriarAssociacao,
    ): Promise<RespostaAssociacao> {
        const nomeFantasia = this.validarTextoObrigatorio(
            request.nomeFantasia,
            "Nome fantasia",
        );
        const razaoSocial = this.validarTextoObrigatorio(request.razaoSocial, "Razao social");
        const cnpj = this.validarTextoObrigatorio(request.cnpj, "CNPJ");
        const inscricaoEstadual = this.validarInscricaoEstadual(request.inscricaoEstadual);

        const usuario = await this.repositorioUsuario.buscar(usuarioId);
        if (!usuario) {
            throw new ErroAplicacao("Usuario nao encontrado", 404);
        }
        if (usuario.role !== Role.ASSOCIACAO) {
            throw new ErroAplicacao("Usuario deve ter role ASSOCIACAO", 400);
        }

        const perfilExistente = await this.repositorioAssociacao.buscarPorUsuarioId(usuarioId);
        if (perfilExistente) {
            throw new ErroAplicacao("Usuario ja possui perfil de associacao", 400);
        }

        const cnpjExistente = await this.repositorioAssociacao.buscarPorCnpj(cnpj);
        if (cnpjExistente) {
            throw new ErroAplicacao("CNPJ ja cadastrado", 400);
        }

        const criada = await this.repositorioAssociacao.criar({
            nomeFantasia,
            razaoSocial,
            cnpj,
            inscricaoEstadual,
            usuarioId,
        });

        return this.paraResposta(criada);
    }

    async listar(usuarioLogado: UsuarioAutenticado): Promise<RespostaAssociacao[]> {
        if (usuarioLogado.role === Role.ASSOCIACAO) {
            const propria = await this.repositorioAssociacao.buscarPorUsuarioId(
                usuarioLogado.id,
            );
            return propria ? [this.paraResposta(propria)] : [];
        }

        if (usuarioLogado.role === Role.LOJISTA) {
            const lojista = await this.repositorioLojista.buscarPorUsuarioId(
                usuarioLogado.id,
            );
            if (lojista) {
                const vinculada = await this.repositorioAssociacao.buscar(
                    lojista.associacaoId,
                );
                return vinculada ? [this.paraResposta(vinculada)] : [];
            }
            return [];
        }

        throw new ErroAplicacao("Acesso nao autorizado para este perfil", 403);
    }

    async buscar(
        idParam: string,
        usuarioLogado: UsuarioAutenticado,
    ): Promise<RespostaAssociacao> {
        const id = this.parseId(idParam);
        const associacao = await this.repositorioAssociacao.buscar(id);

        if (!associacao) {
            throw new ErroAplicacao("Associacao nao encontrada", 404);
        }

        if (usuarioLogado.role === Role.ASSOCIACAO) {
            if (associacao.usuarioId !== usuarioLogado.id) {
                throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
            }
            return this.paraResposta(associacao);
        }

        if (usuarioLogado.role === Role.LOJISTA) {
            const lojista = await this.repositorioLojista.buscarPorUsuarioId(
                usuarioLogado.id,
            );
            if (!lojista || associacao.id !== lojista.associacaoId) {
                throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
            }
            return this.paraResposta(associacao);
        }

        throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
    }

    async atualizar(
        idParam: string,
        usuarioLogadoId: number,
        request: DTOAtualizarAssociacao,
    ): Promise<RespostaAssociacao> {
        const id = this.parseId(idParam);
        const existente = await this.repositorioAssociacao.buscar(id);

        if (!existente) {
            throw new ErroAplicacao("Associacao nao encontrada", 404);
        }

        this.garantirDono(existente.usuarioId, usuarioLogadoId);

        const nomeFantasia = this.validarTextoObrigatorio(
            request.nomeFantasia,
            "Nome fantasia",
        );
        const razaoSocial = this.validarTextoObrigatorio(request.razaoSocial, "Razao social");
        const cnpj = this.validarTextoObrigatorio(request.cnpj, "CNPJ");
        const inscricaoEstadual = this.validarInscricaoEstadual(request.inscricaoEstadual);

        if (cnpj !== existente.cnpj) {
            const cnpjExistente = await this.repositorioAssociacao.buscarPorCnpj(cnpj);
            if (cnpjExistente) {
                throw new ErroAplicacao("CNPJ ja cadastrado", 400);
            }
        }

        const atualizada = await this.repositorioAssociacao.atualizar(id, {
            nomeFantasia,
            razaoSocial,
            cnpj,
            inscricaoEstadual,
        });

        return this.paraResposta(atualizada);
    }

    async deletar(idParam: string, usuarioLogadoId: number): Promise<void> {
        const id = this.parseId(idParam);
        const existente = await this.repositorioAssociacao.buscar(id);

        if (!existente) {
            throw new ErroAplicacao("Associacao nao encontrada", 404);
        }

        this.garantirDono(existente.usuarioId, usuarioLogadoId);

        await this.repositorioAssociacao.deletar(id);
    }

    private garantirDono(perfilUsuarioId: number, usuarioLogadoId: number): void {
        if (perfilUsuarioId !== usuarioLogadoId) {
            throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
        }
    }

    private paraResposta(associacao: Associacao): RespostaAssociacao {
        return {
            id: associacao.id,
            nomeFantasia: associacao.nomeFantasia,
            razaoSocial: associacao.razaoSocial,
            cnpj: associacao.cnpj,
            inscricaoEstadual: associacao.inscricaoEstadual,
            usuarioId: associacao.usuarioId,
            dataCriacao: associacao.dataCriacao,
            dataAtualizacao: associacao.dataAtualizacao,
        };
    }

    private validarTextoObrigatorio(valor: unknown, campo: string): string {
        if (typeof valor !== "string" || !valor.trim()) {
            throw new ErroAplicacao(`${campo} e obrigatorio`, 400);
        }
        return valor.trim();
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
            throw new ErroAplicacao("ID da associacao invalido", 400);
        }
        return id;
    }
}
