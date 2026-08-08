import { RespostaViaCep } from "../../../shared/infra/ClienteViaCep";
import { RepositorioGeografia } from "../repository/RepositorioGeografia";
import { resolverNomeRua } from "../utils/enderecoUtils";

type ClientePrisma = ConstructorParameters<typeof RepositorioGeografia>[0];

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
    const repositorioGeografia = new RepositorioGeografia(cliente);

    const estado = await repositorioGeografia.buscarOuCriarEstado(
        dadosViaCep.estado,
        dadosViaCep.uf,
    );

    const cidade = await repositorioGeografia.buscarOuCriarCidade(
        dadosViaCep.localidade,
        estado.id,
    );

    const bairro = await repositorioGeografia.buscarOuCriarBairro(
        dadosViaCep.bairro,
        cidade.id,
    );

    const rua = await repositorioGeografia.buscarOuCriarRua(
        resolverNomeRua(dadosViaCep.logradouro),
    );

    return {
        estadoId: estado.id,
        cidadeId: cidade.id,
        bairroId: bairro.id,
        ruaId: rua.id,
    };
}
