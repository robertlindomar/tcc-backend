import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ClienteViaCep } from "../../../shared/infra/ClienteViaCep";
import { DTOAtualizarEndereco } from "../dto/DTOAtualizarEndereco";
import { RespostaEndereco } from "../dtos/RespostaEndereco";
import { RepositorioEndereco } from "../repository/RepositorioEndereco";
import { normalizarCep, parseId } from "../utils/enderecoUtils";
import { resolverGeografiaViaCep } from "./resolverGeografiaViaCep";

export class ServicoAtualizarEndereco {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly repositorioEndereco: RepositorioEndereco,
        private readonly clienteViaCep: ClienteViaCep,
    ) {}

    async executar(
        idParam: string,
        dto: DTOAtualizarEndereco,
    ): Promise<RespostaEndereco> {
        const id = parseId(idParam, "ID do endereco invalido");

        const enderecoAtual = await this.repositorioEndereco.buscarPorId(id);

        if (!enderecoAtual) {
            throw new ErroAplicacao("Endereco nao encontrado", 404);
        }

        if (!dto.cep && dto.numero === undefined) {
            throw new ErroAplicacao("Informe ao menos um campo para atualizar");
        }

        if (dto.cep) {
            const cep = normalizarCep(dto.cep);
            const dadosViaCep = await this.clienteViaCep.buscarPorCep(cep);

            return this.prisma.$transaction(async (tx) => {
                const geografia = await resolverGeografiaViaCep(dadosViaCep, tx);

                return this.repositorioEndereco.atualizar(
                    id,
                    {
                        cep,
                        numero: dto.numero !== undefined ? dto.numero : enderecoAtual.numero,
                        ruaId: geografia.ruaId,
                        bairroId: geografia.bairroId,
                        cidadeId: geografia.cidadeId,
                        estadoId: geografia.estadoId,
                    },
                    tx,
                );
            });
        }

        return this.repositorioEndereco.atualizar(id, {
            cep: enderecoAtual.cep,
            numero: dto.numero !== undefined ? dto.numero : enderecoAtual.numero,
            ruaId: enderecoAtual.rua.id,
            bairroId: enderecoAtual.bairro.id,
            cidadeId: enderecoAtual.cidade.id,
            estadoId: enderecoAtual.estado.id,
        });
    }
}
