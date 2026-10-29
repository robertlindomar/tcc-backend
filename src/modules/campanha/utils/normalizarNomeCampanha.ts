/**
 * Chave de unicidade do nome da campanha: sem acentos, minúsculas, sem espaços
 * nas pontas e com espaços internos comprimidos. A migration de edições
 * reproduz esta regra em SQL; manter as duas em sincronia.
 */
export function normalizarNomeCampanha(nome: string): string {
    return nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}
