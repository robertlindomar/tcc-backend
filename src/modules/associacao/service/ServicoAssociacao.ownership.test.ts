import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { Role } from "../../auth/enum/Role";
import { Lojista } from "../../lojista/model/Lojista";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Associacao } from "../model/Associacao";
import { RepositorioAssociacao } from "../repository/RepositorioAssociacao";
import { ServicoAssociacao } from "./ServicoAssociacao";

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

function lojistaFake(associacaoId: number): Lojista {
    const agora = new Date();
    return new Lojista({
        id: 10,
        nomeFantasia: "Loja A",
        razaoSocial: "Loja A LTDA",
        cnpj: "22.222.222/0001-22",
        inscricaoEstadual: null,
        status: StatusLojista.APROVADO,
        usuarioId: 50,
        associacaoId,
        enderecoId: null,
        justificativaRejeicao: null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoAssociacao ownership", () => {
    const associacaoA = associacaoFake(1, 1);
    const associacaoB = associacaoFake(2, 2);

    let repositorioAssociacaoMock: {
        buscar: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        listar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: {
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoAssociacao;

    beforeEach(() => {
        repositorioAssociacaoMock = {
            buscar: vi.fn(),
            buscarPorUsuarioId: vi.fn(),
            listar: vi.fn(),
        };
        repositorioLojistaMock = {
            buscarPorUsuarioId: vi.fn(),
        };
        servico = new ServicoAssociacao(
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
            {} as RepositorioUsuario,
            repositorioLojistaMock as unknown as RepositorioLojista,
        );
    });

    it("lojista com loja recebe somente a associacao vinculada", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(lojistaFake(1));
        repositorioAssociacaoMock.buscar.mockResolvedValue(associacaoA);

        const lista = await servico.listar({ id: 50, role: Role.LOJISTA });

        expect(lista).toHaveLength(1);
        expect(lista[0].id).toBe(1);
        expect(repositorioAssociacaoMock.listar).not.toHaveBeenCalled();
    });

    it("lojista sem loja ainda lista associacoes (onboarding /minha-loja)", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(null);
        repositorioAssociacaoMock.listar.mockResolvedValue([associacaoA, associacaoB]);

        const lista = await servico.listar({ id: 50, role: Role.LOJISTA });

        expect(lista).toHaveLength(2);
        expect(repositorioAssociacaoMock.listar).toHaveBeenCalledOnce();
    });

    it("associacao A nao consulta associacao B por ID", async () => {
        repositorioAssociacaoMock.buscar.mockResolvedValue(associacaoB);

        await expect(
            servico.buscar("2", { id: 1, role: Role.ASSOCIACAO }),
        ).rejects.toMatchObject({ statusCode: 403 } satisfies Partial<ErroAplicacao>);
    });

    it("lojista com loja nao consulta associacao de outro tenant", async () => {
        repositorioAssociacaoMock.buscar.mockResolvedValue(associacaoB);
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(lojistaFake(1));

        await expect(
            servico.buscar("2", { id: 50, role: Role.LOJISTA }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("consumidor nao lista associacoes", async () => {
        await expect(
            servico.listar({ id: 99, role: Role.CONSUMIDOR }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});
