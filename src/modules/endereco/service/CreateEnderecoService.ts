import { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../shared/errors/AppError";
import { ViaCepClient } from "../../../shared/infra/ViaCepClient";
import { CreateEnderecoDTO } from "../dto/CreateEnderecoDTO";
import { EnderecoResponse } from "../dtos/EnderecoResponse";
import { Endereco } from "../model/Endereco";
import { EnderecoRepository } from "../repository/EnderecoRepository";
import { normalizarCep } from "../utils/enderecoUtils";
import { resolverGeografiaViaCep } from "./resolverGeografiaViaCep";

export class CreateEnderecoService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly enderecoRepository: EnderecoRepository,
        private readonly viaCepClient: ViaCepClient,
    ) {}

    async executar(dto: CreateEnderecoDTO): Promise<EnderecoResponse> {
        const cep = normalizarCep(dto.cep);

        const usuario = await this.prisma.usuario.findUnique({
            where: { id: dto.usuarioId },
        });

        if (!usuario) {
            throw new AppError("Usuario nao encontrado", 404);
        }

        const jaPossuiEndereco = await this.enderecoRepository.existePorUsuarioId(dto.usuarioId);

        if (jaPossuiEndereco) {
            throw new AppError("Usuario ja possui endereco");
        }

        const dadosViaCep = await this.viaCepClient.buscarPorCep(cep);

        return this.prisma.$transaction(async (tx) => {
            const geografia = await resolverGeografiaViaCep(dadosViaCep, tx);

            const endereco = new Endereco({
                id: 0,
                cep,
                numero: dto.numero ?? null,
                usuarioId: dto.usuarioId,
                ruaId: geografia.ruaId,
                bairroId: geografia.bairroId,
                cidadeId: geografia.cidadeId,
                estadoId: geografia.estadoId,
                dataCriacao: new Date(),
                dataAtualizacao: new Date(),
            });

            return this.enderecoRepository.criar(endereco, tx);
        });
    }
}
