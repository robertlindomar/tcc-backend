import { garantirProprioId } from "../../../shared/authz/garantirProprioId";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RespostaEndereco } from "../dtos/RespostaEndereco";
import { RepositorioEndereco } from "../repository/RepositorioEndereco";
import { parseId } from "../utils/enderecoUtils";

export class ServicoEncontrarEnderecoPorUsuario {
    constructor(private readonly repositorioEndereco: RepositorioEndereco) {}

    async executar(usuarioIdParam: string, usuarioLogadoId: number): Promise<RespostaEndereco> {
        const usuarioId = parseId(usuarioIdParam, "ID do usuario invalido");
        garantirProprioId(usuarioId, usuarioLogadoId);

        const endereco = await this.repositorioEndereco.buscarPorUsuarioId(usuarioId);

        if (!endereco) {
            throw new ErroAplicacao("Endereco nao encontrado", 404);
        }

        return endereco;
    }
}
