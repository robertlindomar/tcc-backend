import prismaClient from "../../../prisma";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { ControladorEvento } from "../controller/ControladorEvento";
import { RepositorioEvento } from "../repository/RepositorioEvento";
import { ServicoEvento } from "../service/ServicoEvento";

export function criarControladorEvento(): ControladorEvento {
    const repositorioEvento = new RepositorioEvento(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const servico = new ServicoEvento(repositorioEvento, repositorioLojista);
    return new ControladorEvento(servico);
}
