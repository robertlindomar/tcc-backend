import prismaClient from "../../../prisma";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioProduto } from "../../produto/repository/RepositorioProduto";
import { ControladorPromocao } from "../controller/ControladorPromocao";
import { RepositorioPromocao } from "../repository/RepositorioPromocao";
import { ServicoPromocao } from "../service/ServicoPromocao";

export function criarControladorPromocao(): ControladorPromocao {
    const repositorioPromocao = new RepositorioPromocao(prismaClient);
    const repositorioProduto = new RepositorioProduto(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const servico = new ServicoPromocao(
        repositorioPromocao,
        repositorioProduto,
        repositorioLojista,
    );
    return new ControladorPromocao(servico);
}
