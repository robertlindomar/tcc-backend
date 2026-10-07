import prisma from "../../../prisma";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { ControladorAvisoSorteio } from "./ControladorAvisoSorteio";
import { RepositorioAvisoSorteio } from "./RepositorioAvisoSorteio";
import { ServicoAvisoSorteio } from "./ServicoAvisoSorteio";

export function criarControladorAvisoSorteio() {
    return new ControladorAvisoSorteio(new ServicoAvisoSorteio(
        new RepositorioAvisoSorteio(prisma), new RepositorioConsumidor(prisma),
    ));
}
