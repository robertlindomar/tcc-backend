import prismaClient from "../../../prisma";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { ControladorDashboard } from "../controller/ControladorDashboard";
import { RepositorioDashboard } from "../repository/RepositorioDashboard";
import { ServicoDashboard } from "../service/ServicoDashboard";

export function criarControladorDashboard(): ControladorDashboard {
    const repositorioDashboard = new RepositorioDashboard(prismaClient);
    const repositorioAssociacao = new RepositorioAssociacao(prismaClient);
    const servico = new ServicoDashboard(repositorioDashboard);
    return new ControladorDashboard(servico, repositorioAssociacao);
}
