import prismaClient from "../../../prisma";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { ControladorLojista } from "../controller/ControladorLojista";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "../service/ServicoLojista";

export function criarControladorLojista(): ControladorLojista {
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const repositorioUsuario = new RepositorioUsuario(prismaClient);
    const repositorioAssociacao = new RepositorioAssociacao(prismaClient);
    const servico = new ServicoLojista(
        repositorioLojista,
        repositorioUsuario,
        repositorioAssociacao,
    );
    return new ControladorLojista(servico);
}
