import { garantirProprioId } from "../../../shared/authz/garantirProprioId";
import { resolverLojistaAprovado } from "../../../shared/authz/resolverLojistaAprovado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { DTOAtualizarConsumidor } from "../dto/DTOAtualizarConsumidor";
import { DTOCriarConsumidor } from "../dto/DTOCriarConsumidor";
import { RespostaConsumidor } from "../dtos/RespostaConsumidor";
import {
    RespostaListagemVisitantesLoja,
    RespostaVisitanteLoja,
} from "../dtos/RespostaVisitanteLoja";
import { Consumidor } from "../model/Consumidor";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";

export class ServicoConsumidor {
    constructor(
        private readonly repositorioConsumidor: RepositorioConsumidor,
        private readonly repositorioUsuario: RepositorioUsuario,
        private readonly repositorioEndereco: RepositorioEndereco,
        private readonly repositorioSexo: RepositorioSexo,
        private readonly repositorioLojista: RepositorioLojista,
    ) {}

    async criar(
        usuarioId: number,
        request: DTOCriarConsumidor,
    ): Promise<RespostaConsumidor> {
        const cpf = this.validarCpf(request.cpf);
        const sexoId = await this.validarSexoOpcional(request.sexoId);

        const usuario = await this.repositorioUsuario.buscar(usuarioId);
        if (!usuario) {
            throw new ErroAplicacao("Usuario nao encontrado", 404);
        }
        if (usuario.role !== Role.CONSUMIDOR) {
            throw new ErroAplicacao("Usuario deve ter role CONSUMIDOR", 400);
        }

        const endereco = await this.repositorioEndereco.buscarPorUsuarioId(usuarioId);
        if (!endereco) {
            throw new ErroAplicacao("Usuario deve ter endereco", 400);
        }

        const perfilExistente = await this.repositorioConsumidor.buscarPorUsuarioId(usuarioId);
        if (perfilExistente) {
            throw new ErroAplicacao("Usuario ja possui perfil de consumidor", 400);
        }

        const cpfExistente = await this.repositorioConsumidor.buscarPorCpf(cpf);
        if (cpfExistente) {
            throw new ErroAplicacao("CPF ja cadastrado", 400);
        }

        const criado = await this.repositorioConsumidor.criar({
            cpf,
            usuarioId,
            sexoId,
            lojistaId: null,
        });

        return this.paraResposta(criado);
    }

    async listar(
        usuarioLogado: { id: number; role: Role },
    ): Promise<RespostaListagemVisitantesLoja> {
        if (usuarioLogado.role === Role.ASSOCIACAO) {
            throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
        }

        if (usuarioLogado.role === Role.CONSUMIDOR) {
            throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
        }

        if (usuarioLogado.role !== Role.LOJISTA) {
            throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
        }

        const { lojistaId } = await resolverLojistaAprovado(
            this.repositorioLojista,
            usuarioLogado.id,
        );

        const consumidores =
            await this.repositorioConsumidor.listarVisitantesPorLoja(lojistaId);
        const totalVisitas = consumidores.reduce(
            (soma, item) => soma + item.quantidadeVisitas,
            0,
        );

        return {
            consumidores,
            consumidoresUnicos: consumidores.length,
            totalVisitas,
        };
    }

    async buscar(
        idParam: string,
        usuarioLogado: { id: number; role: Role },
    ): Promise<RespostaConsumidor | RespostaVisitanteLoja> {
        const id = this.parseId(idParam);

        if (usuarioLogado.role === Role.CONSUMIDOR) {
            const consumidor = await this.repositorioConsumidor.buscar(id);
            if (!consumidor) {
                throw new ErroAplicacao("Consumidor nao encontrado", 404);
            }
            garantirProprioId(consumidor.usuarioId, usuarioLogado.id);
            return this.paraResposta(consumidor);
        }

        if (usuarioLogado.role === Role.LOJISTA) {
            const { lojistaId } = await resolverLojistaAprovado(
                this.repositorioLojista,
                usuarioLogado.id,
            );
            const visitante = await this.repositorioConsumidor.buscarVisitanteDaLoja(
                id,
                lojistaId,
            );
            if (!visitante) {
                throw new ErroAplicacao("Consumidor nao encontrado", 404);
            }
            return visitante;
        }

        throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
    }

    async atualizar(
        idParam: string,
        usuarioLogado: { id: number; role: Role },
        request: DTOAtualizarConsumidor,
    ): Promise<RespostaConsumidor> {
        if (usuarioLogado.role !== Role.CONSUMIDOR) {
            throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
        }

        const id = this.parseId(idParam);
        const existente = await this.repositorioConsumidor.buscar(id);

        if (!existente) {
            throw new ErroAplicacao("Consumidor nao encontrado", 404);
        }

        garantirProprioId(existente.usuarioId, usuarioLogado.id);

        const cpf = this.validarCpf(request.cpf);
        const sexoId = await this.validarSexoOpcional(request.sexoId);

        if (cpf !== existente.cpf) {
            const cpfExistente = await this.repositorioConsumidor.buscarPorCpf(cpf);
            if (cpfExistente) {
                throw new ErroAplicacao("CPF ja cadastrado", 400);
            }
        }

        const atualizado = await this.repositorioConsumidor.atualizar(id, {
            cpf,
            sexoId,
        });

        return this.paraResposta(atualizado);
    }

    async deletar(
        idParam: string,
        usuarioLogado: { id: number; role: Role },
    ): Promise<void> {
        if (usuarioLogado.role !== Role.CONSUMIDOR) {
            throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
        }

        const id = this.parseId(idParam);
        const existente = await this.repositorioConsumidor.buscar(id);

        if (!existente) {
            throw new ErroAplicacao("Consumidor nao encontrado", 404);
        }

        garantirProprioId(existente.usuarioId, usuarioLogado.id);

        await this.repositorioConsumidor.deletar(id);
    }

    private paraResposta(consumidor: Consumidor): RespostaConsumidor {
        return {
            id: consumidor.id,
            cpf: consumidor.cpf,
            pontos: consumidor.pontos,
            nivel: consumidor.nivel,
            sexoId: consumidor.sexoId,
            lojistaId: consumidor.lojistaId,
            usuarioId: consumidor.usuarioId,
            dataCriacao: consumidor.dataCriacao,
            dataAtualizacao: consumidor.dataAtualizacao,
        };
    }

    private validarCpf(valor: unknown): string {
        if (typeof valor !== "string" || !valor.trim()) {
            throw new ErroAplicacao("CPF e obrigatorio", 400);
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

    private async validarSexoOpcional(valor: unknown): Promise<number | null> {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }

        const sexoId = this.validarIdNumerico(valor, "sexoId");
        const sexo = await this.repositorioSexo.buscar(sexoId);
        if (!sexo) {
            throw new ErroAplicacao("Sexo nao encontrado", 404);
        }

        return sexoId;
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID do consumidor invalido", 400);
        }
        return id;
    }
}
