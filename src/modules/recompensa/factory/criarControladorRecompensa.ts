import prismaClient from "../../../prisma";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { ControladorRecompensa } from "../controller/ControladorRecompensa";
import { RepositorioRecompensa } from "../repository/RepositorioRecompensa";
import { RepositorioResgateRecompensa } from "../repository/RepositorioResgateRecompensa";
import { ServicoRecompensa } from "../service/ServicoRecompensa";

export function criarControladorRecompensa(): ControladorRecompensa {
    const servico = new ServicoRecompensa(
        new RepositorioRecompensa(prismaClient),
        new RepositorioResgateRecompensa(prismaClient),
        new RepositorioLojista(prismaClient),
        new RepositorioConsumidor(prismaClient),
        new RepositorioAssociacao(prismaClient),
    );
    return new ControladorRecompensa(servico);
}
