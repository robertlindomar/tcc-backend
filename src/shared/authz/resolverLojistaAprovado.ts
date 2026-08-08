import { StatusLojista } from "../../generated/prisma/enums";
import { RepositorioLojista } from "../../modules/lojista/repository/RepositorioLojista";
import { ErroAplicacao } from "../erros/ErroAplicacao";

/**
 * Resolve o lojista do usuário autenticado.
 * Exige perfil existente com status APROVADO; caso contrário 403/404.
 */
export async function resolverLojistaAprovado(
    repositorioLojista: RepositorioLojista,
    usuarioId: number,
): Promise<{ lojistaId: number }> {
    const lojista = await repositorioLojista.buscarPorUsuarioId(usuarioId);

    if (!lojista) {
        throw new ErroAplicacao("Lojista nao encontrado para o usuario logado", 404);
    }

    if (lojista.status !== StatusLojista.APROVADO) {
        throw new ErroAplicacao("Lojista precisa estar APROVADO para esta operacao", 403);
    }

    return { lojistaId: lojista.id };
}
