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

function associacaoFake(id = 3): Associacao {
    const agora = new Date();
    return new Associacao({
        id,
        nomeFantasia: "Assoc A",
        razaoSocial: "Assoc A LTDA",
        cnpj: "11.111.111/0001-11",
        inscricaoEstadual: null,
        usuarioId: 10,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function lojistaFake(overrides: Partial<{ id: number; associacaoId: number }> = {}): Lojista {
    const agora = new Date();
    return new Lojista({
        id: overrides.id ?? 1,
        nomeFantasia: "Loja X",
        razaoSocial: "Loja X LTDA",
        cnpj: "22.222.222/0001-22",
        inscricaoEstadual: null,
        status: StatusLojista.PENDENTE,
        usuarioId: 50,
        associacaoId: overrides.associacaoId ?? 3,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoLojista.listar isolamento", () => {
    let repositorioLojistaMock: {
        listarPorAssociacaoId: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
    };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoLojista;

    beforeEach(() => {
        repositorioLojistaMock = {
            listarPorAssociacaoId: vi.fn().mockResolvedValue([lojistaFake()]),
            buscarPorUsuarioId: vi.fn(),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(associacaoFake(3)),
        };
        servico = new ServicoLojista(
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as RepositorioUsuario,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
        );
    });

    it("ASSOCIACAO lista apenas lojistas da propria associacao", async () => {
        const lista = await servico.listar({ id: 10, role: Role.ASSOCIACAO });

        expect(repositorioAssociacaoMock.buscarPorUsuarioId).toHaveBeenCalledWith(10);
        expect(repositorioLojistaMock.listarPorAssociacaoId).toHaveBeenCalledWith(
            3,
            undefined,
        );
        expect(lista).toHaveLength(1);
        expect(lista[0].associacaoId).toBe(3);
    });

    it("ASSOCIACAO sem perfil recebe 404", async () => {
        repositorioAssociacaoMock.buscarPorUsuarioId.mockResolvedValue(null);

        await expect(
            servico.listar({ id: 10, role: Role.ASSOCIACAO }),
        ).rejects.toMatchObject({
            statusCode: 404,
        } satisfies Partial<ErroAplicacao>);
    });

    it("CONSUMIDOR recebe 403", async () => {
        await expect(
            servico.listar({ id: 99, role: Role.CONSUMIDOR }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});
