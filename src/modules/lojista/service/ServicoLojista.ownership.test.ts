import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Lojista } from "../model/Lojista";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "./ServicoLojista";

function associacaoFake(id: number, usuarioId: number): Associacao {
    const agora = new Date();
    return new Associacao({
        id,
        nomeFantasia: `Assoc ${id}`,
        razaoSocial: `Assoc ${id} LTDA`,
        cnpj: `11.111.111/0001-0${id}`,
        inscricaoEstadual: null,
        usuarioId,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function lojistaFake(overrides: {
    id: number;
    usuarioId: number;
    associacaoId: number;
    status?: StatusLojista;
}): Lojista {
    const agora = new Date();
    return new Lojista({
        id: overrides.id,
        nomeFantasia: `Loja ${overrides.id}`,
        razaoSocial: `Loja ${overrides.id} LTDA`,
        cnpj: `22.222.222/0001-0${overrides.id}`,
        inscricaoEstadual: null,
        status: overrides.status ?? StatusLojista.PENDENTE,
        usuarioId: overrides.usuarioId,
        associacaoId: overrides.associacaoId,
        enderecoId: null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoLojista ownership", () => {
    const lojistaA = lojistaFake({ id: 10, usuarioId: 50, associacaoId: 1 });
    const lojistaB = lojistaFake({ id: 11, usuarioId: 51, associacaoId: 2 });

    let repositorioLojistaMock: {
        buscar: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        atualizarStatus: ReturnType<typeof vi.fn>;
        listarPorAssociacaoId: ReturnType<typeof vi.fn>;
    };
    let repositorioAssociacaoMock: {
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        buscar: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoLojista;

    beforeEach(() => {
        repositorioLojistaMock = {
            buscar: vi.fn(),
            buscarPorUsuarioId: vi.fn(),
            atualizarStatus: vi.fn(),
            listarPorAssociacaoId: vi.fn(),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn(),
            buscar: vi.fn(),
        };
        servico = new ServicoLojista(
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as RepositorioUsuario,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
            {} as never,
        );
    });

    it("lojista A acessa o proprio registro", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaA);

        const resultado = await servico.buscar("10", { id: 50, role: Role.LOJISTA });

        expect(resultado.id).toBe(10);
    });

    it("lojista A nao acessa lojista B", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaB);

        await expect(
            servico.buscar("11", { id: 50, role: Role.LOJISTA }),
        ).rejects.toMatchObject({ statusCode: 403 } satisfies Partial<ErroAplicacao>);
    });

    it("associacao A acessa seu lojista A", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaA);
        repositorioAssociacaoMock.buscarPorUsuarioId.mockResolvedValue(
            associacaoFake(1, 1),
        );

        const resultado = await servico.buscar("10", { id: 1, role: Role.ASSOCIACAO });

        expect(resultado.id).toBe(10);
        expect(resultado.associacaoId).toBe(1);
    });

    it("associacao A nao acessa lojista B da associacao B", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaB);
        repositorioAssociacaoMock.buscarPorUsuarioId.mockResolvedValue(
            associacaoFake(1, 1),
        );

        await expect(
            servico.buscar("11", { id: 1, role: Role.ASSOCIACAO }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("consumidor nao acessa GET /lojista/:id", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaA);

        await expect(
            servico.buscar("10", { id: 99, role: Role.CONSUMIDOR }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("associacao A aprova seu lojista", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaA);
        repositorioAssociacaoMock.buscarPorUsuarioId.mockResolvedValue(
            associacaoFake(1, 1),
        );
        repositorioLojistaMock.atualizarStatus.mockResolvedValue(
            lojistaFake({
                id: 10,
                usuarioId: 50,
                associacaoId: 1,
                status: StatusLojista.APROVADO,
            }),
        );

        const resultado = await servico.aprovar("10", 1);

        expect(resultado.status).toBe(StatusLojista.APROVADO);
        expect(repositorioLojistaMock.atualizarStatus).toHaveBeenCalledWith(
            10,
            StatusLojista.APROVADO,
        );
    });

    it("associacao A nao aprova lojista da associacao B", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaB);
        repositorioAssociacaoMock.buscarPorUsuarioId.mockResolvedValue(
            associacaoFake(1, 1),
        );

        await expect(servico.aprovar("11", 1)).rejects.toMatchObject({
            statusCode: 403,
            message: "Lojista nao pertence a sua associacao",
        });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });

    it("associacao A nao rejeita lojista da associacao B", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(lojistaB);
        repositorioAssociacaoMock.buscarPorUsuarioId.mockResolvedValue(
            associacaoFake(1, 1),
        );

        await expect(servico.rejeitar("11", 1)).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });
});
