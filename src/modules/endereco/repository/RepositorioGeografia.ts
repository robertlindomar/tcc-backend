import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";

type ClientePrisma =
    | PrismaClient
    | Omit<
          PrismaClient,
          "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
      >;

export class RepositorioGeografia {
    constructor(private readonly prisma: ClientePrisma) {}

    async buscarOuCriarEstado(nome: string, uf: string) {
        try {
            const existente = await this.prisma.estado.findFirst({
                where: { uf },
            });

            if (existente) {
                return existente;
            }

            return await this.prisma.estado.create({
                data: { nome, uf },
            });
        } catch {
            throw new ErroAplicacao("Erro ao salvar estado", 500);
        }
    }

    async buscarOuCriarCidade(nome: string, estadoId: number) {
        try {
            const existente = await this.prisma.cidade.findFirst({
                where: { nome, estadoId },
            });

            if (existente) {
                return existente;
            }

            return await this.prisma.cidade.create({
                data: { nome, estadoId },
            });
        } catch {
            throw new ErroAplicacao("Erro ao salvar cidade", 500);
        }
    }

    async buscarOuCriarBairro(nome: string, cidadeId: number) {
        try {
            const existente = await this.prisma.bairro.findFirst({
                where: { nome, cidadeId },
            });

            if (existente) {
                return existente;
            }

            return await this.prisma.bairro.create({
                data: { nome, cidadeId },
            });
        } catch {
            throw new ErroAplicacao("Erro ao salvar bairro", 500);
        }
    }

    async buscarOuCriarRua(nome: string) {
        try {
            const existente = await this.prisma.rua.findFirst({
                where: { nome },
            });

            if (existente) {
                return existente;
            }

            return await this.prisma.rua.create({
                data: { nome },
            });
        } catch {
            throw new ErroAplicacao("Erro ao salvar rua", 500);
        }
    }
}
