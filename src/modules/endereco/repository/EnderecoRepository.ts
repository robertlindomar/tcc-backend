import { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../shared/errors/AppError";
import { EnderecoResponse } from "../dtos/EnderecoResponse";
import { Endereco } from "../model/Endereco";

type ClientePrisma = PrismaClient | Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

const includeRelacoes = {
    rua: true,
    bairro: true,
    cidade: true,
    estado: true,
} as const;

type EnderecoComRelacoes = {
    id: number;
    cep: string;
    numero: string | null;
    usuarioId: number;
    ruaId: number;
    bairroId: number;
    cidadeId: number;
    estadoId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
    rua: { id: number; nome: string };
    bairro: { id: number; nome: string };
    cidade: { id: number; nome: string };
    estado: { id: number; nome: string; uf: string };
};

export class EnderecoRepository {
    constructor(private readonly prisma: ClientePrisma) {}

    async criar(
        endereco: Endereco,
        cliente: ClientePrisma = this.prisma,
    ): Promise<EnderecoResponse> {
        try {
            const criado = await cliente.endereco.create({
                data: {
                    cep: endereco.cep,
                    numero: endereco.numero,
                    usuarioId: endereco.usuarioId,
                    ruaId: endereco.ruaId,
                    bairroId: endereco.bairroId,
                    cidadeId: endereco.cidadeId,
                    estadoId: endereco.estadoId,
                },
                include: includeRelacoes,
            });

            return this.toResponse(criado);
        } catch {
            throw new AppError("Erro ao criar endereco", 500);
        }
    }

    async atualizar(
        id: number,
        dados: {
            cep: string;
            numero: string | null;
            ruaId: number;
            bairroId: number;
            cidadeId: number;
            estadoId: number;
        },
        cliente: ClientePrisma = this.prisma,
    ): Promise<EnderecoResponse> {
        try {
            const atualizado = await cliente.endereco.update({
                where: { id },
                data: dados,
                include: includeRelacoes,
            });

            return this.toResponse(atualizado);
        } catch {
            throw new AppError("Erro ao atualizar endereco", 500);
        }
    }

    async buscarPorId(id: number): Promise<EnderecoResponse | null> {
        try {
            const endereco = await this.prisma.endereco.findUnique({
                where: { id },
                include: includeRelacoes,
            });

            if (!endereco) {
                return null;
            }

            return this.toResponse(endereco);
        } catch {
            throw new AppError("Erro ao buscar endereco por ID", 500);
        }
    }

    async buscarPorUsuarioId(usuarioId: number): Promise<EnderecoResponse | null> {
        try {
            const endereco = await this.prisma.endereco.findUnique({
                where: { usuarioId },
                include: includeRelacoes,
            });

            if (!endereco) {
                return null;
            }

            return this.toResponse(endereco);
        } catch {
            throw new AppError("Erro ao buscar endereco por usuario", 500);
        }
    }

    async existePorUsuarioId(usuarioId: number): Promise<boolean> {
        try {
            const endereco = await this.prisma.endereco.findUnique({
                where: { usuarioId },
                select: { id: true },
            });

            return endereco !== null;
        } catch {
            throw new AppError("Erro ao verificar endereco do usuario", 500);
        }
    }

    async deletar(id: number): Promise<void> {
        try {
            await this.prisma.endereco.delete({ where: { id } });
        } catch {
            throw new AppError("Erro ao deletar endereco", 500);
        }
    }

    private toResponse(endereco: EnderecoComRelacoes): EnderecoResponse {
        return {
            id: endereco.id,
            cep: endereco.cep,
            numero: endereco.numero,
            usuarioId: endereco.usuarioId,
            rua: {
                id: endereco.rua.id,
                nome: endereco.rua.nome,
            },
            bairro: {
                id: endereco.bairro.id,
                nome: endereco.bairro.nome,
            },
            cidade: {
                id: endereco.cidade.id,
                nome: endereco.cidade.nome,
            },
            estado: {
                id: endereco.estado.id,
                nome: endereco.estado.nome,
                uf: endereco.estado.uf,
            },
            dataCriacao: endereco.dataCriacao,
            dataAtualizacao: endereco.dataAtualizacao,
        };
    }
}
