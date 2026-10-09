import { RepositorioAssociacao } from "../../modules/associacao/repository/RepositorioAssociacao";
import { ErroAplicacao } from "../erros/ErroAplicacao";

/**
 * Resolve a associação do usuário autenticado.
 * Exige perfil existente; caso contrário 404.
 */
export async function resolverAssociacaoLogada(
    repositorioAssociacao: RepositorioAssociacao,
    usuarioId: number,
): Promise<{ associacaoId: number }> {
    const associacao = await repositorioAssociacao.buscarPorUsuarioId(usuarioId);

    if (!associacao) {
        throw new ErroAplicacao("Associacao nao encontrada para o usuario logado", 404);
    }

    return { associacaoId: associacao.id };
}
