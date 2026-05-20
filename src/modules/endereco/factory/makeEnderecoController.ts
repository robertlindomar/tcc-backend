import prismaClient from "../../../prisma";
import { ViaCepClient } from "../../../shared/infra/ViaCepClient";
import { EnderecoController } from "../controller/EnderecoController";
import { EnderecoRepository } from "../repository/EnderecoRepository";
import { CreateEnderecoService } from "../service/CreateEnderecoService";
import { DeleteEnderecoService } from "../service/DeleteEnderecoService";
import { EncontrarEnderecoPorUsuarioService } from "../service/EncontrarEnderecoPorUsuarioService";
import { UpdateEnderecoService } from "../service/UpdateEnderecoService";

export function makeEnderecoController(): EnderecoController {
    const enderecoRepository = new EnderecoRepository(prismaClient);
    const viaCepClient = new ViaCepClient();

    const createEnderecoService = new CreateEnderecoService(
        prismaClient,
        enderecoRepository,
        viaCepClient,
    );

    const updateEnderecoService = new UpdateEnderecoService(
        prismaClient,
        enderecoRepository,
        viaCepClient,
    );

    const encontrarEnderecoPorUsuarioService = new EncontrarEnderecoPorUsuarioService(
        enderecoRepository,
    );

    const deleteEnderecoService = new DeleteEnderecoService(enderecoRepository);

    return new EnderecoController(
        createEnderecoService,
        updateEnderecoService,
        encontrarEnderecoPorUsuarioService,
        deleteEnderecoService,
    );
}
