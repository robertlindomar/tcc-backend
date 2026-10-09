import prismaClient from "../../../prisma";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { ControladorConsumidor } from "../controller/ControladorConsumidor";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";
import { ServicoConsumidor } from "../service/ServicoConsumidor";

export function criarControladorConsumidor(): ControladorConsumidor {
    const repositorioConsumidor = new RepositorioConsumidor(prismaClient);
    const repositorioUsuario = new RepositorioUsuario(prismaClient);
    const repositorioEndereco = new RepositorioEndereco(prismaClient);
    const repositorioSexo = new RepositorioSexo(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);

    const servico = new ServicoConsumidor(
        repositorioConsumidor,
        repositorioUsuario,
        repositorioEndereco,
        repositorioSexo,
        repositorioLojista,
    );

    return new ControladorConsumidor(servico);
}
