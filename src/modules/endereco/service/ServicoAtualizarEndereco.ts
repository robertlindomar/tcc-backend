import { PrismaClient } from "../../../generated/prisma/client";
import { garantirProprioId } from "../../../shared/authz/garantirProprioId";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ClienteViaCep } from "../../../shared/infra/ClienteViaCep";
import { DTOAtualizarEndereco } from "../dto/DTOAtualizarEndereco";
import { RespostaEndereco } from "../dtos/RespostaEndereco";
import { RepositorioEndereco } from "../repository/RepositorioEndereco";
import { normalizarCep, parseId } from "../utils/enderecoUtils";
import { resolverGeografiaViaCep } from "./resolverGeografiaViaCep";
import { validarCoordenadasEndereco } from "../utils/validarCoordenadasEndereco";

export class ServicoAtualizarEndereco {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly repositorioEndereco: RepositorioEndereco,
        private readonly clienteViaCep: ClienteViaCep,
    ) {}

    async executar(
        idParam: string,
        usuarioLogadoId: number,
        dto: DTOAtualizarEndereco,
    ): Promise<RespostaEndereco> {
        const id = parseId(idParam, "ID do endereco invalido");

        const enderecoAtual = await this.repositorioEndereco.buscarPorId(id);

        if (!enderecoAtual) {
            throw new ErroAplicacao("Endereco nao encontrado", 404);
        }

        garantirProprioId(enderecoAtual.usuarioId, usuarioLogadoId);

        if (
            !dto.cep &&
            dto.numero === undefined &&
            dto.latitude === undefined &&
            dto.longitude === undefined
        ) {
            throw new ErroAplicacao("Informe ao menos um campo para atualizar");
        }

        const coordenadas = validarCoordenadasEndereco(
            dto.latitude === undefined ? enderecoAtual.latitude : dto.latitude,
            dto.longitude === undefined ? enderecoAtual.longitude : dto.longitude,
        );

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
                        latitude: coordenadas.latitude,
                        longitude: coordenadas.longitude,
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
            latitude: coordenadas.latitude,
            longitude: coordenadas.longitude,
            ruaId: enderecoAtual.rua.id,
            bairroId: enderecoAtual.bairro.id,
            cidadeId: enderecoAtual.cidade.id,
            estadoId: enderecoAtual.estado.id,
        });
    }
}
