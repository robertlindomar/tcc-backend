import { StatusLojista } from "../../generated/prisma/enums";
import { Lojista } from "../../modules/lojista/model/Lojista";
import { RepositorioLojista } from "../../modules/lojista/repository/RepositorioLojista";
import { ErroAplicacao } from "../erros/ErroAplicacao";

export async function garantirLojaCatalogo(
    repositorioLojista: RepositorioLojista,
    lojistaIdParam: string,
): Promise<{ lojistaId: number; lojista: Lojista }> {
    const lojistaId = Number(lojistaIdParam);
    if (!Number.isInteger(lojistaId) || lojistaId <= 0) {
        throw new ErroAplicacao("lojistaId invalido", 400);
    }

    const lojista = await repositorioLojista.buscar(lojistaId);
    if (!lojista || lojista.status !== StatusLojista.APROVADO) {
        throw new ErroAplicacao("Loja nao encontrada", 404);
    }

    return { lojistaId, lojista };
}
