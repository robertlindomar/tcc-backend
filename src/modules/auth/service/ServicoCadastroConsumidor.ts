import bcrypt from "bcryptjs";
import { Prisma } from "../../../generated/prisma/client";
import prismaClient, { AppPrismaClient } from "../../../prisma";
import { resolverGeografiaViaCep } from "../../endereco/service/resolverGeografiaViaCep";
import { normalizarCep } from "../../endereco/utils/enderecoUtils";
import { RespostaPerfilConsumidorAtual } from "../../consumidor/dtos/RespostaPerfilConsumidorAtual";
import { Role } from "../enum/Role";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ClienteViaCep } from "../../../shared/infra/ClienteViaCep";
import { DTOCadastroConsumidor } from "../dto/DTOCadastroConsumidor";

/**
 * Orquestra o cadastro público do consumidor sem deixar usuário ou endereço
 * parcialmente criados caso uma das etapas de persistência falhe.
 */
export class ServicoCadastroConsumidor {
    constructor(
        private readonly prisma: AppPrismaClient = prismaClient,
        private readonly clienteViaCep: ClienteViaCep = new ClienteViaCep(),
    ) {}

    async executar(dto: DTOCadastroConsumidor): Promise<RespostaPerfilConsumidorAtual> {
        const nome = this.validarTexto(dto.nome, "Nome");
        const email = this.validarTexto(dto.email, "Email");
        const senha = this.validarTexto(dto.senha, "Senha");
        const cpf = this.validarTexto(dto.cpf, "CPF");
        const cep = normalizarCep(dto.cep);
        const numero = this.normalizarNumero(dto.numero);
        const sexoId = await this.validarSexoOpcional(dto.sexoId);

        // A consulta externa ocorre antes de abrir a transação, sem escrita local.
        const dadosViaCep = await this.clienteViaCep.buscarPorCep(cep);
        const senhaHash = await bcrypt.hash(senha, 10);

        try {
            return await this.prisma.$transaction(async (tx) => {
                const usuarioExistente = await tx.usuario.findUnique({ where: { email } });
                if (usuarioExistente) {
                    throw new ErroAplicacao("Email ja cadastrado", 400);
                }

                const consumidorExistente = await tx.consumidor.findUnique({
                    where: { cpf },
                });
                if (consumidorExistente) {
                    throw new ErroAplicacao("CPF ja cadastrado", 400);
                }

                const usuario = await tx.usuario.create({
                    data: {
                        nome,
                        email,
                        senha: senhaHash,
                        role: Role.CONSUMIDOR,
                    },
                });

                const geografia = await resolverGeografiaViaCep(dadosViaCep, tx);
                await tx.endereco.create({
                    data: {
                        cep,
                        numero,
                        usuarioId: usuario.id,
                        ...geografia,
                    },
                });

                const consumidor = await tx.consumidor.create({
                    data: {
                        cpf,
                        sexoId,
                        usuarioId: usuario.id,
                        lojistaId: null,
                    },
                });

                return {
                    usuario: {
                        id: usuario.id,
                        nome: usuario.nome,
                        email: usuario.email,
                        role: Role.CONSUMIDOR,
                        ativo: usuario.ativo,
                        dataCriacao: usuario.dataCriacao,
                        dataAtualizacao: usuario.dataAtualizacao,
                    },
                    consumidor: {
                        id: consumidor.id,
                        cpf: consumidor.cpf,
                        pontos: consumidor.pontos,
                        nivel: consumidor.nivel,
                        sexoId: consumidor.sexoId,
                        usuarioId: consumidor.usuarioId,
                        dataCriacao: consumidor.dataCriacao,
                        dataAtualizacao: consumidor.dataAtualizacao,
                    },
                } satisfies RespostaPerfilConsumidorAtual;
            });
        } catch (error) {
            if (error instanceof ErroAplicacao) {
                throw error;
            }

            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new ErroAplicacao("Email ou CPF ja cadastrado", 400);
            }

            throw new ErroAplicacao("Erro ao cadastrar consumidor", 500);
        }
    }

    private validarTexto(valor: unknown, campo: string): string {
        if (typeof valor !== "string" || !valor.trim()) {
            throw new ErroAplicacao(`${campo} e obrigatorio`, 400);
        }
        return valor.trim();
    }

    private normalizarNumero(valor: unknown): string | null {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }

        if (typeof valor !== "string") {
            throw new ErroAplicacao("Numero invalido", 400);
        }

        return valor.trim() || null;
    }

    private async validarSexoOpcional(valor: unknown): Promise<number | null> {
        if (valor === undefined || valor === null || valor === "") {
            return null;
        }

        const sexoId = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isInteger(sexoId) || sexoId <= 0) {
            throw new ErroAplicacao("sexoId invalido", 400);
        }

        const sexo = await this.prisma.sexo.findUnique({ where: { id: sexoId } });
        if (!sexo) {
            throw new ErroAplicacao("Sexo nao encontrado", 404);
        }

        return sexoId;
    }
}
