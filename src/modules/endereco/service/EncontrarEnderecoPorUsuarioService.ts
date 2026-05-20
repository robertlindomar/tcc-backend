import { AppError } from "../../../shared/errors/AppError";
import { EnderecoResponse } from "../dtos/EnderecoResponse";
import { EnderecoRepository } from "../repository/EnderecoRepository";
import { parseId } from "../utils/enderecoUtils";

export class EncontrarEnderecoPorUsuarioService {
    constructor(private readonly enderecoRepository: EnderecoRepository) {}

    async executar(usuarioIdParam: string): Promise<EnderecoResponse> {
        const usuarioId = parseId(usuarioIdParam, "ID do usuario invalido");

        const endereco = await this.enderecoRepository.buscarPorUsuarioId(usuarioId);

        if (!endereco) {
            throw new AppError("Endereco nao encontrado", 404);
        }

        return endereco;
    }
}
