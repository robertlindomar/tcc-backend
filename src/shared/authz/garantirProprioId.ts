import { ErroAplicacao } from "../erros/ErroAplicacao";

export function garantirProprioId(idRecurso: number, idAutenticado: number): void {
    if (idRecurso !== idAutenticado) {
        throw new ErroAplicacao("Acesso nao autorizado a este recurso", 403);
    }
}
