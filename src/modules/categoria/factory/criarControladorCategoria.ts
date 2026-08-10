import prismaClient from "../../../prisma";
import { ControladorCategoria } from "../controller/ControladorCategoria";
import { RepositorioCategoria } from "../repository/RepositorioCategoria";
import { ServicoCategoria } from "../service/ServicoCategoria";

export function criarControladorCategoria(): ControladorCategoria {
    const repositorio = new RepositorioCategoria(prismaClient);
    const servico = new ServicoCategoria(repositorio);
    return new ControladorCategoria(servico);
}
