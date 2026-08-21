import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { Lojista } from "../model/Lojista";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "./ServicoLojista";

function lojistaFake(status: StatusLojista, id = 1): Lojista {
    const agora = new Date();
    return new Lojista({
        id,
        nomeFantasia: `Loja ${id}`,
        razaoSocial: `Loja ${id} LTDA`,
        cnpj: "22.222.222/0001-22",
        inscricaoEstadual: null,
        status,
        usuarioId: 50 + id,
        associacaoId: 3,
        enderecoId: null,
        justificativaRejeicao: null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoLojista.listarCatalogo", () => {
    let repositorioLojistaMock: {
        listar: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoLojista;

    beforeEach(() => {
        repositorioLojistaMock = {
            listar: vi.fn().mockResolvedValue([lojistaFake(StatusLojista.APROVADO, 8)]),
            buscar: vi.fn(),
        };
        servico = new ServicoLojista(
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as never,
            {} as never,
            {} as never,
        );
    });

    it("lista apenas lojas APROVADO sem vazar CNPJ ou status", async () => {
        const lista = await servico.listarCatalogo();

        expect(repositorioLojistaMock.listar).toHaveBeenCalledWith(StatusLojista.APROVADO);
        expect(lista).toEqual([{ id: 8, nomeFantasia: "Loja 8" }]);
        expect(lista[0]).not.toHaveProperty("cnpj");
        expect(lista[0]).not.toHaveProperty("status");
    });

    it("detalhe de loja aprovada nao inclui CNPJ e pode omitir endereco", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaFake(StatusLojista.APROVADO, 8));

        const detalhe = await servico.buscarCatalogo("8");

        expect(detalhe).toEqual({
            id: 8,
            nomeFantasia: "Loja 8",
            enderecoTexto: null,
        });
        expect(detalhe).not.toHaveProperty("cnpj");
    });
});
