import prismaClient from "../../../prisma";
import { ClienteViaCep } from "../../../shared/infra/ClienteViaCep";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { ServicoUsuario } from "../../usuario/service/ServicoUsuario";
import { ControladorAuth } from "../controller/ControladorAuth";
import { ServicoCadastro } from "../service/ServicoCadastro";
import { ServicoCadastroConsumidor } from "../service/ServicoCadastroConsumidor";
import { ServicoLogin } from "../service/ServicoLogin";

export function criarControladorAuth(): ControladorAuth {
    const repositorioUsuario = new RepositorioUsuario(prismaClient);
    const servicoUsuario = new ServicoUsuario(repositorioUsuario);
    const servicoLogin = new ServicoLogin(repositorioUsuario);
    const servicoCadastro = new ServicoCadastro(servicoUsuario);
    const servicoCadastroConsumidor = new ServicoCadastroConsumidor(
        prismaClient,
        new ClienteViaCep(),
    );

    return new ControladorAuth(servicoLogin, servicoCadastro, servicoCadastroConsumidor);
}
