import { RespostaViaCep } from "../../../shared/infra/ViaCepClient";
import { GeografiaRepository } from "../repository/GeografiaRepository";
import { resolverNomeRua } from "../utils/enderecoUtils";

type ClientePrisma = ConstructorParameters<typeof GeografiaRepository>[0];

export type GeografiaResolvida = {
    estadoId: number;
    cidadeId: number;
    bairroId: number;
    ruaId: number;
};

export async function resolverGeografiaViaCep(
    dadosViaCep: RespostaViaCep,
    cliente: ClientePrisma,
): Promise<GeografiaResolvida> {
    const geografiaRepository = new GeografiaRepository(cliente);

    const estado = await geografiaRepository.buscarOuCriarEstado(
        dadosViaCep.estado,
        dadosViaCep.uf,
    );

    const cidade = await geografiaRepository.buscarOuCriarCidade(
        dadosViaCep.localidade,
        estado.id,
    );

    const bairro = await geografiaRepository.buscarOuCriarBairro(
        dadosViaCep.bairro,
        cidade.id,
    );

    const rua = await geografiaRepository.buscarOuCriarRua(
        resolverNomeRua(dadosViaCep.logradouro),
    );

    return {
        estadoId: estado.id,
        cidadeId: cidade.id,
        bairroId: bairro.id,
        ruaId: rua.id,
    };
}
