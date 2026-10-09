import prismaClient from "../../../prisma";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioCampanha } from "../../campanha/repository/RepositorioCampanha";
import { ControladorSorteio } from "../controller/ControladorSorteio";
import { RepositorioSorteio } from "../repository/RepositorioSorteio";
import { ServicoSorteio } from "../service/ServicoSorteio";

export function criarControladorSorteio(): ControladorSorteio {
    const repositorioSorteio = new RepositorioSorteio(prismaClient);
    const repositorioCampanha = new RepositorioCampanha(prismaClient);
    const repositorioAssociacao = new RepositorioAssociacao(prismaClient);
    const servico = new ServicoSorteio(
        repositorioSorteio,
        repositorioCampanha,
        repositorioAssociacao,
    );
    return new ControladorSorteio(servico);
}
