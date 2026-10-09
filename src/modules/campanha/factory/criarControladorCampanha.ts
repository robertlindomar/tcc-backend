import prismaClient from "../../../prisma";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { ControladorCampanha } from "../controller/ControladorCampanha";
import { RepositorioCampanha } from "../repository/RepositorioCampanha";
import { ServicoCampanha } from "../service/ServicoCampanha";

export function criarControladorCampanha(): ControladorCampanha {
    const repositorioCampanha = new RepositorioCampanha(prismaClient);
    const repositorioAssociacao = new RepositorioAssociacao(prismaClient);
    const servico = new ServicoCampanha(repositorioCampanha, repositorioAssociacao);
    return new ControladorCampanha(servico);
}
