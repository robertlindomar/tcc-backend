import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Produto } from "../../produto/model/Produto";
import { RepositorioProduto } from "../../produto/repository/RepositorioProduto";
import { Promocao } from "../model/Promocao";
import { RepositorioPromocao } from "../repository/RepositorioPromocao";
import { ServicoPromocao } from "./ServicoPromocao";

describe("ServicoPromocao por status do lojista", () => {
    let repositorioPromocaoMock: {
        criar: ReturnType<typeof vi.fn>;
        listarPorLojistaId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };
    let repositorioProdutoMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoPromocao;

    beforeEach(() => {
        repositorioPromocaoMock = {
            criar: vi.fn(),
            listarPorLojistaId: vi.fn().mockResolvedValue([]),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
        repositorioProdutoMock = { buscar: vi.fn() };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        servico = new ServicoPromocao(
            repositorioPromocaoMock as unknown as RepositorioPromocao,
            repositorioProdutoMock as unknown as RepositorioProduto,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    it("PENDENTE nao cria promocao", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );

        await expect(
            servico.criar(20, { produtoId: 1, preco: 10, duracaoDias: 7 }),
        ).rejects.toMatchObject({
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioPromocaoMock.criar).not.toHaveBeenCalled();
    });

    it("PENDENTE nao desativa promocao", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );

        await expect(servico.desativar(20, "7")).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioPromocaoMock.atualizar).not.toHaveBeenCalled();
    });

    it("REJEITADO nao desativa promocao", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.desativar(20, "7")).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioPromocaoMock.atualizar).not.toHaveBeenCalled();
    });

    it("PENDENTE nao reativa promocao", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );

        await expect(servico.reativar(20, "7")).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioPromocaoMock.atualizar).not.toHaveBeenCalled();
    });

    it("REJEITADO nao reativa promocao", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.reativar(20, "7")).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioPromocaoMock.atualizar).not.toHaveBeenCalled();
    });

    it("REJEITADO nao cria promocao", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(
            servico.criar(20, { produtoId: 1, preco: 10, duracaoDias: 7 }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioPromocaoMock.criar).not.toHaveBeenCalled();
    });

    it("APROVADO cria promocao do proprio produto", async () => {
        const agora = new Date();
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(
            new Produto({
                id: 1,
                nome: "Cafe",
                valor: 12,
                categoriaId: null,
                lojistaId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );
        repositorioPromocaoMock.criar.mockResolvedValue(
            new Promocao({
                id: 7,
                descricao: null,
                preco: 10,
                produtoId: 1,
                ativa: true,
                dataInicio: agora,
                dataFim: new Date(agora.getTime() + 7 * 86400000),
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(20, {
            produtoId: 1,
            preco: 10,
            duracaoDias: 7,
        });

        expect(resultado.id).toBe(7);
        expect(repositorioPromocaoMock.criar).toHaveBeenCalledOnce();
    });

    it("REJEITADO nao lista promocoes", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.listar(20)).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioPromocaoMock.listarPorLojistaId).not.toHaveBeenCalled();
    });
});
