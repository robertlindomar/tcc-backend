import { ErroAplicacao } from "../erros/ErroAplicacao";

export function recusarEscritaCatalogoGlobal(): never {
    throw new ErroAplicacao("Escrita de catalogo global nao permitida", 403);
}
