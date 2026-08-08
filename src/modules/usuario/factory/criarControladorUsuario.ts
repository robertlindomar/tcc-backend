import prismaClient from "../../../prisma";
import { ControladorUsuario } from "../controller/ControladorUsuario";
import { RepositorioUsuario } from "../repository/RepositorioUsuario";
import { ServicoUsuario } from "../service/ServicoUsuario";

export function criarControladorUsuario(): ControladorUsuario {
    const repositorio = new RepositorioUsuario(prismaClient);
    const servico = new ServicoUsuario(repositorio);
    return new ControladorUsuario(servico);
}
