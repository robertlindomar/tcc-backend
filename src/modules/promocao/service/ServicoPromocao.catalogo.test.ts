import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Promocao } from "../model/Promocao";
import { RepositorioPromocao } from "../repository/RepositorioPromocao";
import { ServicoPromocao } from "./ServicoPromocao";

function promocaoFake(ativa: boolean, dataFim: Date): Promocao {
    const agora = new Date();
    return new Promocao({
        id: 3,
        descricao: "10% OFF em oculos de sol",
        preco: 90,
        ativa,
        dataInicio: new Date(agora.getTime() - 60_000),
        dataFim,
        produtoId: 7,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoPromocao.listarCatalogo", () => {
    let repositorioPromocaoMock: { listarCatalogoPorLojistaId: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: { buscar: ReturnType<typeof vi.fn> };
    let servico: ServicoPromocao;

    beforeEach(() => {
        repositorioPromocaoMock = { listarCatalogoPorLojistaId: vi.fn() };
        repositorioLojistaMock = { buscar: vi.fn() };
        servico = new ServicoPromocao(
            repositorioPromocaoMock as unknown as RepositorioPromocao,
            {} as never,
            repositorioLojistaMock as never,
        );
    });

    it("lista so promocoes vigentes da loja aprovada", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaFake({ status: StatusLojista.APROVADO }));
        const futura = new Date(Date.now() + 86_400_000);
        const passada = new Date(Date.now() - 86_400_000);
        repositorioPromocaoMock.listarCatalogoPorLojistaId.mockResolvedValue([
            { promocao: promocaoFake(true, futura), produtoNome: "Oculos", produtoValor: 100 },
            { promocao: promocaoFake(true, passada), produtoNome: "Armação", produtoValor: 80 },
        ]);

        const lista = await servico.listarCatalogo("5");

        expect(lista).toHaveLength(1);
        expect(lista[0]).toMatchObject({
            produtoNome: "Oculos",
            percentualDesconto: 10,
        });
    });
});
