import { AppError } from "../../../shared/errors/AppError";
import { EnderecoRepository } from "../repository/EnderecoRepository";
import { parseId } from "../utils/enderecoUtils";

export class DeleteEnderecoService {
    constructor(private readonly enderecoRepository: EnderecoRepository) {}

    async executar(idParam: string): Promise<void> {
        const id = parseId(idParam, "ID do endereco invalido");

        const endereco = await this.enderecoRepository.buscarPorId(id);

        if (!endereco) {
            throw new AppError("Endereco nao encontrado", 404);
        }

        await this.enderecoRepository.deletar(id);
    }
}
