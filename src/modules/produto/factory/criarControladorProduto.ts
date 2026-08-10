import prismaClient from "../../../prisma";
import { RepositorioCategoria } from "../../categoria/repository/RepositorioCategoria";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { ControladorProduto } from "../controller/ControladorProduto";
import { RepositorioProduto } from "../repository/RepositorioProduto";
import { ServicoProduto } from "../service/ServicoProduto";

export function criarControladorProduto(): ControladorProduto {
    const repositorioProduto = new RepositorioProduto(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const repositorioCategoria = new RepositorioCategoria(prismaClient);
    const servico = new ServicoProduto(
        repositorioProduto,
        repositorioLojista,
        repositorioCategoria,
    );
    return new ControladorProduto(servico);
}
