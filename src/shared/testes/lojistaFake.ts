import { StatusLojista } from "../../generated/prisma/enums";
import { Lojista } from "../../modules/lojista/model/Lojista";

/** Fake de Lojista para testes de status/ownership. */
export function lojistaFake(overrides: {
    status: StatusLojista;
    id?: number;
    usuarioId?: number;
    associacaoId?: number;
    enderecoId?: number | null;
}): Lojista {
    const agora = new Date();
    return new Lojista({
        id: overrides.id ?? 5,
        nomeFantasia: "Loja Teste",
        razaoSocial: "Loja Teste LTDA",
        cnpj: "12.345.678/0001-90",
        inscricaoEstadual: null,
        status: overrides.status,
        usuarioId: overrides.usuarioId ?? 20,
        associacaoId: overrides.associacaoId ?? 1,
        enderecoId: overrides.enderecoId ?? null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}
