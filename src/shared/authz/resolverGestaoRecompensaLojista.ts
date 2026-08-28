import { Role } from "../../modules/auth/enum/Role";
import { RepositorioAssociacao } from "../../modules/associacao/repository/RepositorioAssociacao";
import { RepositorioLojista } from "../../modules/lojista/repository/RepositorioLojista";
import { StatusLojista } from "../../generated/prisma/enums";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { resolverLojistaAprovado } from "./resolverLojistaAprovado";

type UsuarioGestor = {
    id: number;
    role: Role;
};

/**
 * Lojista APROVADO gerencia a própria loja; associação gerencia lojas vinculadas.
 */
export async function resolverGestaoRecompensaLojista(
    repositorioLojista: RepositorioLojista,
    repositorioAssociacao: RepositorioAssociacao,
    usuario: UsuarioGestor,
    lojistaIdAlvo: number,
): Promise<{ lojistaId: number }> {
    if (usuario.role === Role.LOJISTA) {
        const { lojistaId } = await resolverLojistaAprovado(repositorioLojista, usuario.id);
        if (lojistaId !== lojistaIdAlvo) {
            throw new ErroAplicacao("Recompensa nao encontrada", 404);
        }
        return { lojistaId };
    }

    if (usuario.role === Role.ASSOCIACAO) {
        const associacao = await repositorioAssociacao.buscarPorUsuarioId(usuario.id);
        if (!associacao) {
            throw new ErroAplicacao("Associacao nao encontrada para o usuario logado", 404);
        }
        const lojista = await repositorioLojista.buscar(lojistaIdAlvo);
        if (!lojista || lojista.associacaoId !== associacao.id) {
            throw new ErroAplicacao("Lojista nao encontrado", 404);
        }
        if (lojista.status !== StatusLojista.APROVADO) {
            throw new ErroAplicacao("Lojista precisa estar APROVADO para esta operacao", 403);
        }
        return { lojistaId: lojista.id };
    }

    throw new ErroAplicacao("Acesso nao autorizado para este perfil", 403);
}
