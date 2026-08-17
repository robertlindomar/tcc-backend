import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Lojista } from "../../lojista/model/Lojista";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Produto } from "../../produto/model/Produto";
import { RepositorioProduto } from "../../produto/repository/RepositorioProduto";
import { Promocao } from "../model/Promocao";
import { RepositorioPromocao } from "../repository/RepositorioPromocao";
import { ServicoPromocao } from "./ServicoPromocao";

function produtoProprio(agora: Date) {
    return new Produto({
        id: 1,
        nome: "Cafe",
        valor: 12,
        categoriaId: null,
        lojistaId: 5,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function promocaoFake(agora: Date, overrides: Partial<{
    ativa: boolean;
    dataInicio: Date;
    dataFim: Date;
    produtoId: number;
}> = {}) {
    return new Promocao({
        id: 7,
        descricao: "Semana do Cliente",
        preco: 10,
        ativa: overrides.ativa ?? true,
        dataInicio: overrides.dataInicio ?? agora,
        dataFim: overrides.dataFim ?? new Date(agora.getTime() + 7 * 86400000),
        produtoId: overrides.produtoId ?? 1,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoPromocao", () => {
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
    const agora = new Date();

    beforeEach(() => {
        repositorioPromocaoMock = {
            criar: vi.fn(),
            listarPorLojistaId: vi.fn().mockResolvedValue([]),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
        repositorioProdutoMock = { buscar: vi.fn() };
        repositorioLojistaMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(
                new Lojista({
                    id: 5,
                    nomeFantasia: "Minha Loja",
                    razaoSocial: "Minha Loja LTDA",
                    cnpj: "99.888.777/0001-66",
                    inscricaoEstadual: null,
                    status: StatusLojista.APROVADO,
                    usuarioId: 20,
                    associacaoId: 1,
                    enderecoId: null,
                    justificativaRejeicao: null,
                    dataCriacao: agora,
                    dataAtualizacao: agora,
                }),
            ),
        };
        servico = new ServicoPromocao(
            repositorioPromocaoMock as unknown as RepositorioPromocao,
            repositorioProdutoMock as unknown as RepositorioProduto,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    it("retorna erro quando produto pertence a outro lojista", async () => {
        repositorioProdutoMock.buscar.mockResolvedValue(
            new Produto({
                id: 99,
                nome: "Produto Alheio",
                valor: 50,
                categoriaId: null,
                lojistaId: 999,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        await expect(
            servico.criar(20, { produtoId: 99, preco: 40, duracaoDias: 7 }),
        ).rejects.toMatchObject({
            message: "Produto nao encontrado para este lojista",
            statusCode: 404,
        });
        expect(repositorioPromocaoMock.criar).not.toHaveBeenCalled();
    });

    it("rejeita criacao sem duracao", async () => {
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));
        await expect(
            servico.criar(20, { produtoId: 1, preco: 10 } as never),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("rejeita duracao 0", async () => {
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));
        await expect(
            servico.criar(20, { produtoId: 1, preco: 10, duracaoDias: 0 }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("rejeita duracao negativa", async () => {
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));
        await expect(
            servico.criar(20, { produtoId: 1, preco: 10, duracaoDias: -3 }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("cria promocao com duracao valida", async () => {
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));
        repositorioPromocaoMock.criar.mockResolvedValue(promocaoFake(agora));

        const resultado = await servico.criar(20, {
            produtoId: 1,
            preco: 10,
            duracaoDias: 7,
            descricao: "Semana do Cliente",
        });

        expect(repositorioPromocaoMock.criar).toHaveBeenCalledWith(
            expect.objectContaining({
                produtoId: 1,
                preco: 10,
                ativa: true,
            }),
        );
        expect(resultado.statusVigencia).toBe("ATIVA");
        expect(resultado.ativa).toBe(true);
    });

    it("desativar do dono aprovado torna ativa=false", async () => {
        repositorioPromocaoMock.buscar.mockResolvedValue(promocaoFake(agora));
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));
        repositorioPromocaoMock.atualizar.mockResolvedValue(
            promocaoFake(agora, { ativa: false }),
        );

        const resultado = await servico.desativar(20, "7");

        expect(repositorioPromocaoMock.atualizar).toHaveBeenCalledWith(7, {
            ativa: false,
        });
        expect(resultado.statusVigencia).toBe("DESATIVADA");
    });

    it("repetir desativacao e idempotente", async () => {
        repositorioPromocaoMock.buscar.mockResolvedValue(
            promocaoFake(agora, { ativa: false }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));

        const resultado = await servico.desativar(20, "7");

        expect(repositorioPromocaoMock.atualizar).not.toHaveBeenCalled();
        expect(resultado.ativa).toBe(false);
        expect(resultado.statusVigencia).toBe("DESATIVADA");
    });

    it("reativar desativada com validade futura fica ATIVA", async () => {
        repositorioPromocaoMock.buscar.mockResolvedValue(
            promocaoFake(agora, { ativa: false }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));
        repositorioPromocaoMock.atualizar.mockResolvedValue(
            promocaoFake(agora, { ativa: true }),
        );

        const resultado = await servico.reativar(20, "7");

        expect(repositorioPromocaoMock.atualizar).toHaveBeenCalledWith(7, {
            ativa: true,
        });
        expect(resultado.statusVigencia).toBe("ATIVA");
        expect(resultado.ativa).toBe(true);
    });

    it("repetir reativacao e idempotente", async () => {
        repositorioPromocaoMock.buscar.mockResolvedValue(
            promocaoFake(agora, { ativa: true }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));

        const resultado = await servico.reativar(20, "7");

        expect(repositorioPromocaoMock.atualizar).not.toHaveBeenCalled();
        expect(resultado.ativa).toBe(true);
        expect(resultado.statusVigencia).toBe("ATIVA");
    });

    it("reativar com prazo vencido continua EXPIRADA", async () => {
        const inicio = new Date(agora.getTime() - 10 * 86400000);
        const fim = new Date(agora.getTime() - 1 * 86400000);
        repositorioPromocaoMock.buscar.mockResolvedValue(
            promocaoFake(agora, { ativa: false, dataInicio: inicio, dataFim: fim }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));
        repositorioPromocaoMock.atualizar.mockResolvedValue(
            promocaoFake(agora, { ativa: true, dataInicio: inicio, dataFim: fim }),
        );

        const resultado = await servico.reativar(20, "7");

        expect(repositorioPromocaoMock.atualizar).toHaveBeenCalledWith(7, {
            ativa: true,
        });
        expect(resultado.ativa).toBe(true);
        expect(resultado.statusVigencia).toBe("EXPIRADA");
        expect(resultado.dataFim).toEqual(fim);
    });

    it("editar duracao de expirada reinicia a janela", async () => {
        const inicio = new Date(agora.getTime() - 10 * 86400000);
        const fim = new Date(agora.getTime() - 1 * 86400000);
        repositorioPromocaoMock.buscar.mockResolvedValue(
            promocaoFake(agora, { ativa: true, dataInicio: inicio, dataFim: fim }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));
        repositorioPromocaoMock.atualizar.mockImplementation(async (_id, dados) =>
            promocaoFake(agora, {
                ativa: true,
                dataInicio: dados.dataInicio as Date,
                dataFim: dados.dataFim as Date,
            }),
        );

        const resultado = await servico.atualizar(20, "7", { duracaoDias: 5 });

        expect(repositorioPromocaoMock.atualizar).toHaveBeenCalledWith(
            7,
            expect.objectContaining({
                dataInicio: expect.any(Date),
                dataFim: expect.any(Date),
            }),
        );
        expect(resultado.statusVigencia).toBe("ATIVA");
    });

    it("outro lojista nao reativa promocao alheia", async () => {
        repositorioPromocaoMock.buscar.mockResolvedValue(
            promocaoFake(agora, { produtoId: 99 }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(
            new Produto({
                id: 99,
                nome: "Alheio",
                valor: 1,
                categoriaId: null,
                lojistaId: 8,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        await expect(servico.reativar(20, "7")).rejects.toMatchObject({
            statusCode: 404,
        });
        expect(repositorioPromocaoMock.atualizar).not.toHaveBeenCalled();
    });

    it("outro lojista nao desativa promocao alheia", async () => {
        repositorioPromocaoMock.buscar.mockResolvedValue(
            promocaoFake(agora, { produtoId: 99 }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(
            new Produto({
                id: 99,
                nome: "Alheio",
                valor: 1,
                categoriaId: null,
                lojistaId: 8,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        await expect(servico.desativar(20, "7")).rejects.toMatchObject({
            statusCode: 404,
        });
        expect(repositorioPromocaoMock.atualizar).not.toHaveBeenCalled();
    });

    it("exclui promocao do dono mesmo desativada", async () => {
        repositorioPromocaoMock.buscar.mockResolvedValue(
            promocaoFake(agora, { ativa: false }),
        );
        repositorioProdutoMock.buscar.mockResolvedValue(produtoProprio(agora));

        await servico.deletar(20, "7");
        expect(repositorioPromocaoMock.deletar).toHaveBeenCalledWith(7);
    });
});
