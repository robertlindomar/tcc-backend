import { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../shared/errors/AppError";
import { ViaCepClient } from "../../../shared/infra/ViaCepClient";
import { UpdateEnderecoDTO } from "../dto/UpdateEnderecoDTO";
import { EnderecoResponse } from "../dtos/EnderecoResponse";
import { EnderecoRepository } from "../repository/EnderecoRepository";
import { normalizarCep, parseId } from "../utils/enderecoUtils";
import { resolverGeografiaViaCep } from "./resolverGeografiaViaCep";

export class UpdateEnderecoService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly enderecoRepository: EnderecoRepository,
        private readonly viaCepClient: ViaCepClient,
    ) {}

    async executar(idParam: string, dto: UpdateEnderecoDTO): Promise<EnderecoResponse> {
        const id = parseId(idParam, "ID do endereco invalido");

        const enderecoAtual = await this.enderecoRepository.buscarPorId(id);

        if (!enderecoAtual) {
            throw new AppError("Endereco nao encontrado", 404);
        }

        if (!dto.cep && dto.numero === undefined) {
            throw new AppError("Informe ao menos um campo para atualizar");
        }

        if (dto.cep) {
            const cep = normalizarCep(dto.cep);
            const dadosViaCep = await this.viaCepClient.buscarPorCep(cep);

            return this.prisma.$transaction(async (tx) => {
                const geografia = await resolverGeografiaViaCep(dadosViaCep, tx);

                return this.enderecoRepository.atualizar(
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

        return this.enderecoRepository.atualizar(id, {
            cep: enderecoAtual.cep,
            numero: dto.numero !== undefined ? dto.numero : enderecoAtual.numero,
            ruaId: enderecoAtual.rua.id,
            bairroId: enderecoAtual.bairro.id,
            cidadeId: enderecoAtual.cidade.id,
            estadoId: enderecoAtual.estado.id,
        });
    }
}
