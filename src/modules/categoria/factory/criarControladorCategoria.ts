import prismaClient from "../../../prisma";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { ControladorCategoria } from "../controller/ControladorCategoria";
import { RepositorioCategoria } from "../repository/RepositorioCategoria";
import { ServicoCategoria } from "../service/ServicoCategoria";

export function criarControladorCategoria(): ControladorCategoria {
    const repositorioCategoria = new RepositorioCategoria(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const servico = new ServicoCategoria(repositorioCategoria, repositorioLojista);
    return new ControladorCategoria(servico);
}
