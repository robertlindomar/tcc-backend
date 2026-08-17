import prismaClient from "../../../prisma";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioMissaoConsumidor } from "../../missao-consumidor/repository/RepositorioMissaoConsumidor";
import { ControladorMissao } from "../controller/ControladorMissao";
import { RepositorioMissao } from "../repository/RepositorioMissao";
import { ServicoMissao } from "../service/ServicoMissao";

export function criarControladorMissao(): ControladorMissao {
    const repositorioMissao = new RepositorioMissao(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const repositorioMissaoConsumidor = new RepositorioMissaoConsumidor(prismaClient);
    const servico = new ServicoMissao(
        repositorioMissao,
        repositorioLojista,
        repositorioMissaoConsumidor,
    );
    return new ControladorMissao(servico);
}
