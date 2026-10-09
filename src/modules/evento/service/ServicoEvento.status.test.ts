import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Evento } from "../model/Evento";
import { RepositorioEvento } from "../repository/RepositorioEvento";
import { ServicoEvento } from "./ServicoEvento";

describe("ServicoEvento por status do lojista", () => {
    let repositorioEventoMock: {
        criar: ReturnType<typeof vi.fn>;
        listarPorLojistaId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoEvento;

    beforeEach(() => {
        repositorioEventoMock = {
            criar: vi.fn(),
            listarPorLojistaId: vi.fn().mockResolvedValue([]),
            buscar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        servico = new ServicoEvento(
            repositorioEventoMock as unknown as RepositorioEvento,
            repositorioLojistaMock as unknown as RepositorioLojista,
            {
                gravar: vi.fn(),
                remover: vi.fn(),
            } as never,
        );
    });

    it("PENDENTE nao cria evento", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE }),
        );

        await expect(servico.criar(20, { nome: "Feira" })).rejects.toMatchObject({
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioEventoMock.criar).not.toHaveBeenCalled();
    });

    it("REJEITADO nao cria evento", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.criar(20, { nome: "Feira" })).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioEventoMock.criar).not.toHaveBeenCalled();
    });

    it("APROVADO cria evento", async () => {
        const agora = new Date();
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioEventoMock.criar.mockResolvedValue(
            new Evento({
                id: 3,
                nome: "Feira",
                descricao: null,
                lojistaId: 5,
                dataCriacao: agora,
                dataAtualizacao: agora,
            }),
        );

        const resultado = await servico.criar(20, { nome: "Feira" });

        expect(resultado.lojistaId).toBe(5);
        expect(repositorioEventoMock.criar).toHaveBeenCalledOnce();
    });

    it("REJEITADO nao lista eventos", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );

        await expect(servico.listar(20)).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioEventoMock.listarPorLojistaId).not.toHaveBeenCalled();
    });
});
