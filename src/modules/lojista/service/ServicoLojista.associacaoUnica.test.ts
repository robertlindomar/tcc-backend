import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Role } from "../../auth/enum/Role";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { Usuario } from "../../usuario/model/Usuario";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { DTOCriarLojista } from "../dto/DTOCriarLojista";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "./ServicoLojista";

function associacaoFake(id: number): Associacao {
    const agora = new Date();
    return new Associacao({
        id,
        nomeFantasia: `Assoc ${id}`,
        razaoSocial: `Assoc ${id} LTDA`,
        cnpj: `11.111.111/0001-0${id}`,
        inscricaoEstadual: null,
        usuarioId: id,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

function usuarioLojista(): Usuario {
    const agora = new Date();
    return new Usuario({
        id: 20,
        nome: "Lojista",
        email: "loja@teste.com",
        senha: "hash",
        role: Role.LOJISTA,
        ativo: true,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

const dadosCriacao: DTOCriarLojista = {
    nomeFantasia: "Loja Nova",
    razaoSocial: "Loja Nova LTDA",
    cnpj: "77.777.777/0001-77",
};

describe("ServicoLojista associacao unica", () => {
    let repositorioLojistaMock: {
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        buscarPorCnpj: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
    };
    let repositorioUsuarioMock: { buscar: ReturnType<typeof vi.fn> };
    let repositorioAssociacaoMock: { listar: ReturnType<typeof vi.fn> };
    let repositorioEnderecoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoLojista;

    beforeEach(() => {
        repositorioLojistaMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(null),
            buscarPorCnpj: vi.fn().mockResolvedValue(null),
            criar: vi.fn(),
        };
        repositorioUsuarioMock = {
            buscar: vi.fn().mockResolvedValue(usuarioLojista()),
        };
        repositorioAssociacaoMock = { listar: vi.fn() };
        repositorioEnderecoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(null),
        };
        servico = new ServicoLojista(
            repositorioLojistaMock as unknown as RepositorioLojista,
            repositorioUsuarioMock as unknown as RepositorioUsuario,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
            repositorioEnderecoMock as unknown as RepositorioEndereco,
        );
    });

    it("cria lojista sem associacaoId e vincula a unica associacao", async () => {
        repositorioAssociacaoMock.listar.mockResolvedValue([associacaoFake(3)]);
        repositorioLojistaMock.criar.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.PENDENTE,
                id: 8,
                associacaoId: 3,
            }),
        );

        const resultado = await servico.criar(20, dadosCriacao);

        expect(repositorioLojistaMock.criar).toHaveBeenCalledWith(
            expect.objectContaining({ associacaoId: 3, usuarioId: 20 }),
        );
        expect(resultado.associacaoId).toBe(3);
        expect(resultado.status).toBe(StatusLojista.PENDENTE);
    });

    it("nao cria perfil quando nao existe associacao", async () => {
        repositorioAssociacaoMock.listar.mockResolvedValue([]);

        await expect(servico.criar(20, dadosCriacao)).rejects.toMatchObject({
            statusCode: 404,
            message: "Associacao nao encontrada",
        });
        expect(repositorioLojistaMock.criar).not.toHaveBeenCalled();
    });

    it("nao escolhe a primeira quando ha mais de uma associacao", async () => {
        repositorioAssociacaoMock.listar.mockResolvedValue([
            associacaoFake(1),
            associacaoFake(2),
        ]);

        await expect(servico.criar(20, dadosCriacao)).rejects.toMatchObject({
            statusCode: 409,
            message: "Configuracao invalida: existe mais de uma associacao",
        });
        expect(repositorioLojistaMock.criar).not.toHaveBeenCalled();
    });

    it("ignora associacaoId enviado no body", async () => {
        repositorioAssociacaoMock.listar.mockResolvedValue([associacaoFake(1)]);
        repositorioLojistaMock.criar.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.PENDENTE,
                id: 8,
                associacaoId: 1,
            }),
        );

        const bodyHostil = {
            ...dadosCriacao,
            associacaoId: 999,
        } as DTOCriarLojista & { associacaoId: number };

        const resultado = await servico.criar(20, bodyHostil);

        expect(repositorioLojistaMock.criar).toHaveBeenCalledWith(
            expect.objectContaining({ associacaoId: 1 }),
        );
        expect(repositorioLojistaMock.criar.mock.calls[0][0].associacaoId).not.toBe(999);
        expect(resultado.associacaoId).toBe(1);
    });
});
