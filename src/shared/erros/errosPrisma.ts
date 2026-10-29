function codigoPrisma(erro: unknown): unknown {
    return typeof erro === "object" && erro !== null && "code" in erro
        ? (erro as { code: unknown }).code
        : undefined;
}

/** P2002: violação de índice único. */
export function ehViolacaoUnica(erro: unknown): boolean {
    return codigoPrisma(erro) === "P2002";
}

/** P2003: violação de chave estrangeira (ex.: excluir linha ainda referenciada). */
export function ehViolacaoChaveEstrangeira(erro: unknown): boolean {
    return codigoPrisma(erro) === "P2003";
}
