import { beforeEach, describe, expect, it, vi } from "vitest";
import { FrequenciaMissao, StatusLojista } from "../../../generated/prisma/enums";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Missao } from "../model/Missao";
import { RepositorioMissao } from "../repository/RepositorioMissao";
import { ServicoMissao } from "./ServicoMissao";

function missaoFake(tokenQr: string, dataFim: Date | null): Missao {
    return new Missao({
        id: 4,
        nome: "Visite a loja e escaneie o QR Code",
        descricao: null,
        pontoRecompensa: 50,
        frequencia: FrequenciaMissao.DIARIA,
        dataFim,
        sistema: true,
        lojistaId: 5,
        tokenQr,
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
    });
}

describe("ServicoMissao.listarCatalogo", () => {
    let repositorioMissaoMock: { listarPorLojistaId: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: { buscar: ReturnType<typeof vi.fn> };
    let servico: ServicoMissao;

    beforeEach(() => {
        repositorioMissaoMock = { listarPorLojistaId: vi.fn() };
        repositorioLojistaMock = { buscar: vi.fn() };
        servico = new ServicoMissao(
            repositorioMissaoMock as unknown as RepositorioMissao,
            repositorioLojistaMock as never,
            {} as never,
        );
    });

    it("omite tokenQr e missoes expiradas", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaFake({ status: StatusLojista.APROVADO }));
        repositorioMissaoMock.listarPorLojistaId.mockResolvedValue([
            missaoFake("segredo", null),
            missaoFake("outro", new Date("2020-01-01T00:00:00.000Z")),
        ]);

        const lista = await servico.listarCatalogo("5");

        expect(lista).toEqual([
            {
                id: 4,
                nome: "Visite a loja e escaneie o QR Code",
                descricao: null,
                pontoRecompensa: 50,
                sistema: true,
            },
        ]);
        expect(JSON.stringify(lista)).not.toContain("segredo");
    });
});
