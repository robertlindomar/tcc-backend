import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { Lojista } from "../model/Lojista";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { ServicoLojista } from "./ServicoLojista";

function lojistaFake(status: StatusLojista, id = 1, enderecoId: number | null = null): Lojista {
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
        enderecoId,
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
    let repositorioEnderecoMock: { buscarPorId: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        repositorioLojistaMock = {
            listar: vi.fn().mockResolvedValue([lojistaFake(StatusLojista.APROVADO, 8)]),
            buscar: vi.fn(),
        };
        repositorioEnderecoMock = { buscarPorId: vi.fn() };
        servico = new ServicoLojista(
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as never,
            {} as never,
            repositorioEnderecoMock as unknown as RepositorioEndereco,
        );
    });

    it("calcula distancias e ordena lojas proximas antes das sem coordenadas", async () => {
        repositorioLojistaMock.listar.mockResolvedValue([
            lojistaFake(StatusLojista.APROVADO, 8, 80),
            lojistaFake(StatusLojista.APROVADO, 9, 90),
            lojistaFake(StatusLojista.APROVADO, 10),
        ]);
        repositorioEnderecoMock.buscarPorId.mockImplementation(async (id: number) => ({
            latitude: id === 80 ? -23.55052 : -23.561684,
            longitude: id === 80 ? -46.633308 : -46.655981,
        }));

        const lista = await servico.listarCatalogo("-23.55052", "-46.633308");

        expect(lista.map((item) => item.id)).toEqual([8, 9, 10]);
        expect(lista[0].distanciaKm).toBe(0);
        expect(lista[1].distanciaKm).toBeGreaterThan(2);
        expect(lista[2].distanciaKm).toBeNull();
    });

    it("rejeita localizacao parcial ou fora da faixa", async () => {
        await expect(servico.listarCatalogo("-23.5")).rejects.toMatchObject({
            statusCode: 400,
        });
        await expect(servico.listarCatalogo("91", "-46.6")).rejects.toMatchObject({
            statusCode: 400,
        });
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
            latitude: null,
            longitude: null,
        });
        expect(detalhe).not.toHaveProperty("cnpj");
    });
});
