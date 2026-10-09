import prismaClient from "../../../prisma";
import { ControladorSexo } from "../controller/ControladorSexo";
import { RepositorioSexo } from "../repository/RepositorioSexo";
import { ServicoSexo } from "../service/ServicoSexo";

export function criarControladorSexo(): ControladorSexo {
    const repositorio = new RepositorioSexo(prismaClient);
    const servico = new ServicoSexo(repositorio);
    return new ControladorSexo(servico);
}
