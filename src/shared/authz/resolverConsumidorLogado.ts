import { RepositorioConsumidor } from "../../modules/consumidor/repository/RepositorioConsumidor";
import { ErroAplicacao } from "../erros/ErroAplicacao";

/**
 * Resolve o consumidor do usuário autenticado.
 * Exige perfil existente; caso contrário 404.
 */
export async function resolverConsumidorLogado(
    repositorioConsumidor: RepositorioConsumidor,
    usuarioId: number,
): Promise<{ consumidorId: number }> {
    const consumidor = await repositorioConsumidor.buscarPorUsuarioId(usuarioId);

    if (!consumidor) {
        throw new ErroAplicacao("Consumidor nao encontrado para o usuario logado", 404);
    }

    return { consumidorId: consumidor.id };
}
