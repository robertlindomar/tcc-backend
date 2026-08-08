import prismaClient from "../../../prisma";
import { ClienteViaCep } from "../../../shared/infra/ClienteViaCep";
import { ControladorEndereco } from "../controller/ControladorEndereco";
import { RepositorioEndereco } from "../repository/RepositorioEndereco";
import { ServicoAtualizarEndereco } from "../service/ServicoAtualizarEndereco";
import { ServicoCriarEndereco } from "../service/ServicoCriarEndereco";
import { ServicoDeletarEndereco } from "../service/ServicoDeletarEndereco";
import { ServicoEncontrarEnderecoPorUsuario } from "../service/ServicoEncontrarEnderecoPorUsuario";

export function criarControladorEndereco(): ControladorEndereco {
    const repositorioEndereco = new RepositorioEndereco(prismaClient);
    const clienteViaCep = new ClienteViaCep();

    const servicoCriarEndereco = new ServicoCriarEndereco(
        prismaClient,
        repositorioEndereco,
        clienteViaCep,
    );

    const servicoAtualizarEndereco = new ServicoAtualizarEndereco(
        prismaClient,
        repositorioEndereco,
        clienteViaCep,
    );

    const servicoEncontrarEnderecoPorUsuario = new ServicoEncontrarEnderecoPorUsuario(
        repositorioEndereco,
    );

    const servicoDeletarEndereco = new ServicoDeletarEndereco(repositorioEndereco);

    return new ControladorEndereco(
        servicoCriarEndereco,
        servicoAtualizarEndereco,
        servicoEncontrarEnderecoPorUsuario,
        servicoDeletarEndereco,
    );
}
