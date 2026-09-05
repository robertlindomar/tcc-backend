import prismaClient from "../../../prisma";
import { RepositorioCampanha } from "../../campanha/repository/RepositorioCampanha";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { AdaptadorNfceSimulado } from "../adaptador/AdaptadorNfceSimulado";
import { ControladorNfce } from "../controller/ControladorNfce";
import { RepositorioProcessamentoNfce } from "../repository/RepositorioProcessamentoNfce";
import { ServicoProcessarNfce } from "../service/ServicoProcessarNfce";

export function criarControladorNfce(): ControladorNfce {
    const adaptador = new AdaptadorNfceSimulado();
    const repositorioCampanha = new RepositorioCampanha(prismaClient);
    const repositorioLojista = new RepositorioLojista(prismaClient);
    const repositorioProcessamento = new RepositorioProcessamentoNfce(prismaClient);
    const repositorioConsumidor = new RepositorioConsumidor(prismaClient);

    const servico = new ServicoProcessarNfce(
        adaptador,
        repositorioCampanha,
        repositorioLojista,
        repositorioProcessamento,
    );

    return new ControladorNfce(servico, repositorioConsumidor);
}
