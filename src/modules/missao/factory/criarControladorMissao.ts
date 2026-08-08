import prismaClient from "../../../prisma";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { ControladorMissao } from "../controller/ControladorMissao";
import { RepositorioMissao } from "../repository/RepositorioMissao";
import { ServicoMissao } from "../service/ServicoMissao";

export function criarControladorMissao(): ControladorMissao {
    const repositorioMissao = new RepositorioMissao(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const servico = new ServicoMissao(repositorioMissao, repositorioLojista);
    return new ControladorMissao(servico);
}
