import { garantirProprioId } from "../../../shared/authz/garantirProprioId";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioEndereco } from "../repository/RepositorioEndereco";
import { parseId } from "../utils/enderecoUtils";

export class ServicoDeletarEndereco {
    constructor(private readonly repositorioEndereco: RepositorioEndereco) {}

    async executar(idParam: string, usuarioLogadoId: number): Promise<void> {
        const id = parseId(idParam, "ID do endereco invalido");

        const endereco = await this.repositorioEndereco.buscarPorId(id);

        if (!endereco) {
            throw new ErroAplicacao("Endereco nao encontrado", 404);
        }

        garantirProprioId(endereco.usuarioId, usuarioLogadoId);

        await this.repositorioEndereco.deletar(id);
    }
}
