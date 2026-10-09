import { ArmazenamentoDiscoLocal } from "../../../shared/upload/ArmazenamentoDiscoLocal";
import { ServicoUploadImagem } from "../../../shared/upload/ServicoUploadImagem";
import prismaClient from "../../../prisma";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioMissao } from "../../missao/repository/RepositorioMissao";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { ControladorLojista } from "../controller/ControladorLojista";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "../service/ServicoLojista";

export function criarControladorLojista(): ControladorLojista {
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const repositorioUsuario = new RepositorioUsuario(prismaClient);
    const repositorioAssociacao = new RepositorioAssociacao(prismaClient);
    const repositorioEndereco = new RepositorioEndereco(prismaClient);
    const repositorioMissao = new RepositorioMissao(prismaClient);
    const servico = new ServicoLojista(
        repositorioLojista,
        repositorioUsuario,
        repositorioAssociacao,
        repositorioEndereco,
        repositorioMissao,
        new ServicoUploadImagem(new ArmazenamentoDiscoLocal()),
    );
    return new ControladorLojista(servico);
}
