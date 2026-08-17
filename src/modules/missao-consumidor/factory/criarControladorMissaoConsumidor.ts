import prismaClient from "../../../prisma";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioMissao } from "../../missao/repository/RepositorioMissao";
import { ControladorMissaoConsumidor } from "../controller/ControladorMissaoConsumidor";
import { RepositorioMissaoConsumidor } from "../repository/RepositorioMissaoConsumidor";
import { ServicoMissaoConsumidor } from "../service/ServicoMissaoConsumidor";

export function criarControladorMissaoConsumidor(): ControladorMissaoConsumidor {
    const repositorioMissaoConsumidor = new RepositorioMissaoConsumidor(prismaClient);
    const repositorioMissao = new RepositorioMissao(prismaClient);
    const repositorioConsumidor = new RepositorioConsumidor(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const servico = new ServicoMissaoConsumidor(
        repositorioMissaoConsumidor,
        repositorioMissao,
        repositorioConsumidor,
        repositorioLojista,
    );
    return new ControladorMissaoConsumidor(servico);
}
