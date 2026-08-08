import prismaClient from "../../../prisma";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { ControladorAssociacao } from "../controller/ControladorAssociacao";
import { RepositorioAssociacao } from "../repository/RepositorioAssociacao";
import { ServicoAssociacao } from "../service/ServicoAssociacao";

export function criarControladorAssociacao(): ControladorAssociacao {
    const repositorioAssociacao = new RepositorioAssociacao(prismaClient);
    const repositorioUsuario = new RepositorioUsuario(prismaClient);
    const servico = new ServicoAssociacao(repositorioAssociacao, repositorioUsuario);
    return new ControladorAssociacao(servico);
}
