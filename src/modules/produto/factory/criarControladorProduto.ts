import prismaClient from "../../../prisma";
import { ArmazenamentoDiscoLocal } from "../../../shared/upload/ArmazenamentoDiscoLocal";
import { ServicoUploadImagem } from "../../../shared/upload/ServicoUploadImagem";
import { RepositorioCategoria } from "../../categoria/repository/RepositorioCategoria";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { ControladorProduto } from "../controller/ControladorProduto";
import { RepositorioProduto } from "../repository/RepositorioProduto";
import { ServicoProduto } from "../service/ServicoProduto";

export function criarControladorProduto(): ControladorProduto {
    const repositorioProduto = new RepositorioProduto(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const repositorioCategoria = new RepositorioCategoria(prismaClient);
    const servicoUpload = new ServicoUploadImagem(new ArmazenamentoDiscoLocal());
    const servico = new ServicoProduto(
        repositorioProduto,
        repositorioLojista,
        repositorioCategoria,
        servicoUpload,
    );
    return new ControladorProduto(servico);
}
