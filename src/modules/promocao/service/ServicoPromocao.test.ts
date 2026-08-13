import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Lojista } from "../../lojista/model/Lojista";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Produto } from "../../produto/model/Produto";
import { RepositorioProduto } from "../../produto/repository/RepositorioProduto";
import { RepositorioPromocao } from "../repository/RepositorioPromocao";
import { ServicoPromocao } from "./ServicoPromocao";

describe("ServicoPromocao", () => {
    let repositorioPromocaoMock: { criar: ReturnType<typeof vi.fn> };
    let repositorioProdutoMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoPromocao;

    beforeEach(() => {
        const agora = new Date();
        repositorioPromocaoMock = {
            criar: vi.fn(),
        };
        repositorioProdutoMock = {
            buscar: vi.fn(),
        };
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
        const agora = new Date();
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

        const promessa = servico.criar(20, {
            produtoId: 99,
            preco: 40,
        });

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Produto nao encontrado para este lojista",
            statusCode: 404,
        });
        expect(repositorioPromocaoMock.criar).not.toHaveBeenCalled();
    });
});
