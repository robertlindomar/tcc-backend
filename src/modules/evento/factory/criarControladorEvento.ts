import prismaClient from "../../../prisma";
import { ArmazenamentoDiscoLocal } from "../../../shared/upload/ArmazenamentoDiscoLocal";
import { ServicoUploadImagem } from "../../../shared/upload/ServicoUploadImagem";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { ControladorEvento } from "../controller/ControladorEvento";
import { RepositorioEvento } from "../repository/RepositorioEvento";
import { ServicoEvento } from "../service/ServicoEvento";

export function criarControladorEvento(): ControladorEvento {
    const repositorioEvento = new RepositorioEvento(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const servicoUpload = new ServicoUploadImagem(new ArmazenamentoDiscoLocal());
    const servico = new ServicoEvento(repositorioEvento, repositorioLojista, servicoUpload);
    return new ControladorEvento(servico);
}
