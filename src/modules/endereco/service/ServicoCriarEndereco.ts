import { PrismaClient } from "../../../generated/prisma/client";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { ClienteViaCep } from "../../../shared/infra/ClienteViaCep";
import { DTOCriarEndereco } from "../dto/DTOCriarEndereco";
import { RespostaEndereco } from "../dtos/RespostaEndereco";
import { Endereco } from "../model/Endereco";
import { RepositorioEndereco } from "../repository/RepositorioEndereco";
import { normalizarCep } from "../utils/enderecoUtils";
import { resolverGeografiaViaCep } from "./resolverGeografiaViaCep";

export class ServicoCriarEndereco {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly repositorioEndereco: RepositorioEndereco,
        private readonly clienteViaCep: ClienteViaCep,
    ) {}

    async executar(usuarioLogadoId: number, dto: DTOCriarEndereco): Promise<RespostaEndereco> {
        if (dto.usuarioId !== undefined && dto.usuarioId !== null) {
            const informado = Number(dto.usuarioId);
            if (!Number.isInteger(informado) || informado !== usuarioLogadoId) {
                throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
            }
        }

        const cep = normalizarCep(dto.cep);
        const usuarioId = usuarioLogadoId;

        const usuario = await this.prisma.usuario.findUnique({
            where: { id: usuarioId },
        });

        if (!usuario) {
            throw new ErroAplicacao("Usuario nao encontrado", 404);
        }

        const jaPossuiEndereco = await this.repositorioEndereco.existePorUsuarioId(
            usuarioId,
        );

        if (jaPossuiEndereco) {
            throw new ErroAplicacao("Usuario ja possui endereco");
        }

        const dadosViaCep = await this.clienteViaCep.buscarPorCep(cep);

        return this.prisma.$transaction(async (tx) => {
            const geografia = await resolverGeografiaViaCep(dadosViaCep, tx);

            const endereco = new Endereco({
                id: 0,
                cep,
                numero: dto.numero ?? null,
                usuarioId,
                ruaId: geografia.ruaId,
                bairroId: geografia.bairroId,
                cidadeId: geografia.cidadeId,
                estadoId: geografia.estadoId,
                dataCriacao: new Date(),
                dataAtualizacao: new Date(),
            });

            return this.repositorioEndereco.criar(endereco, tx);
        });
    }
}
