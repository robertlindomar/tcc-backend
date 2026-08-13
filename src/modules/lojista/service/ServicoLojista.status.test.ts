import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Role } from "../../auth/enum/Role";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { DTOAtualizarLojista } from "../dto/DTOAtualizarLojista";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "./ServicoLojista";

/** Payload hostil: campos além do DTO chegam do body sem passar pelo tipo. */
function payloadComExtras(extras: Record<string, unknown>): DTOAtualizarLojista {
    return {
        nomeFantasia: "Loja Teste",
        razaoSocial: "Loja Teste LTDA",
        cnpj: "12.345.678/0001-90",
        ...extras,
    } as unknown as DTOAtualizarLojista;
}

/**
 * PENDENTE/REJEITADO precisam ver e corrigir o próprio cadastro para a análise
 * da associação; o bloqueio é só do catálogo comercial.
 */
describe("ServicoLojista: perfil proprio por status", () => {
    let repositorioLojistaMock: {
        buscar: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        buscarPorCnpj: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        atualizarStatus: ReturnType<typeof vi.fn>;
    };
    let repositorioEnderecoMock: {
        buscarPorId: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
    };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoLojista;

    beforeEach(() => {
        repositorioLojistaMock = {
            buscar: vi.fn(),
            buscarPorUsuarioId: vi.fn(),
            buscarPorCnpj: vi.fn().mockResolvedValue(null),
            atualizar: vi.fn(),
            atualizarStatus: vi.fn(),
        };
        repositorioEnderecoMock = {
            buscarPorId: vi.fn(),
            buscarPorUsuarioId: vi.fn(),
        };
        repositorioAssociacaoMock = { buscarPorUsuarioId: vi.fn() };
        servico = new ServicoLojista(
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as RepositorioUsuario,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
            repositorioEnderecoMock as unknown as RepositorioEndereco,
        );
    });

    it("PENDENTE consulta o proprio perfil e ve o status", async () => {
        const proprio = lojistaFake({ status: StatusLojista.PENDENTE, id: 5 });
        repositorioLojistaMock.buscar.mockResolvedValue(proprio);

        const resultado = await servico.buscar("5", { id: 20, role: Role.LOJISTA });

        expect(resultado.id).toBe(5);
        expect(resultado.status).toBe(StatusLojista.PENDENTE);
    });

    it("REJEITADO consulta o proprio perfil e ve o status", async () => {
        const proprio = lojistaFake({ status: StatusLojista.REJEITADO, id: 5 });
        repositorioLojistaMock.buscar.mockResolvedValue(proprio);

        const resultado = await servico.buscar("5", { id: 20, role: Role.LOJISTA });

        expect(resultado.status).toBe(StatusLojista.REJEITADO);
    });

    it("PENDENTE recebe o proprio perfil em GET /lojista (lista scoped)", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5 }),
        );

        const lista = await servico.listar({ id: 20, role: Role.LOJISTA });

        expect(lista).toHaveLength(1);
        expect(lista[0].status).toBe(StatusLojista.PENDENTE);
    });

    it("REJEITADO recebe o proprio perfil em GET /lojista (lista scoped)", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO, id: 5 }),
        );

        const lista = await servico.listar({ id: 20, role: Role.LOJISTA });

        expect(lista).toHaveLength(1);
        expect(lista[0].status).toBe(StatusLojista.REJEITADO);
    });

    it("PENDENTE corrige o proprio cadastro e vincula seu endereco", async () => {
        const proprio = lojistaFake({ status: StatusLojista.PENDENTE, id: 5 });
        repositorioLojistaMock.buscar.mockResolvedValue(proprio);
        repositorioEnderecoMock.buscarPorId.mockResolvedValue({ id: 9, usuarioId: 20 });
        repositorioLojistaMock.atualizar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5, enderecoId: 9 }),
        );

        const resultado = await servico.atualizar(
            "5",
            { id: 20, role: Role.LOJISTA },
            {
                nomeFantasia: "Loja Corrigida",
                razaoSocial: "Loja Corrigida LTDA",
                cnpj: "12.345.678/0001-90",
                enderecoId: 9,
            },
        );

        expect(repositorioLojistaMock.atualizar).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ enderecoId: 9 }),
        );
        expect(resultado.enderecoId).toBe(9);
    });

    it("PENDENTE nao se autoaprova enviando status no corpo do PUT", async () => {
        const proprio = lojistaFake({ status: StatusLojista.PENDENTE, id: 5 });
        repositorioLojistaMock.buscar.mockResolvedValue(proprio);
        repositorioLojistaMock.atualizar.mockResolvedValue(proprio);

        const resultado = await servico.atualizar(
            "5",
            { id: 20, role: Role.LOJISTA },
            payloadComExtras({
                status: StatusLojista.APROVADO,
                statusLojista: StatusLojista.APROVADO,
            }),
        );

        expect(repositorioLojistaMock.atualizar).toHaveBeenCalledWith(5, {
            nomeFantasia: "Loja Teste",
            razaoSocial: "Loja Teste LTDA",
            cnpj: "12.345.678/0001-90",
            inscricaoEstadual: null,
        });
        expect(repositorioLojistaMock.atualizar.mock.calls[0][1]).not.toHaveProperty(
            "status",
        );
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
        expect(resultado.status).toBe(StatusLojista.PENDENTE);
    });

    it("REJEITADO nao se autoaprova enviando status no corpo do PUT", async () => {
        const proprio = lojistaFake({ status: StatusLojista.REJEITADO, id: 5 });
        repositorioLojistaMock.buscar.mockResolvedValue(proprio);
        repositorioLojistaMock.atualizar.mockResolvedValue(proprio);

        const resultado = await servico.atualizar(
            "5",
            { id: 20, role: Role.LOJISTA },
            payloadComExtras({ status: "APROVADO" }),
        );

        expect(repositorioLojistaMock.atualizar.mock.calls[0][1]).not.toHaveProperty(
            "status",
        );
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
        expect(resultado.status).toBe(StatusLojista.REJEITADO);
    });

    it("aprovar exige associacao do usuario logado, nao aceita o proprio lojista", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5 }),
        );
        repositorioAssociacaoMock.buscarPorUsuarioId.mockResolvedValue(null);

        await expect(servico.aprovar("5", 20)).rejects.toMatchObject({
            message: "Associacao nao encontrada para o usuario logado",
            statusCode: 404,
        });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });

    it("REJEITADO nao usa endereco de outro usuario ao corrigir cadastro", async () => {
        const proprio = lojistaFake({ status: StatusLojista.REJEITADO, id: 5 });
        repositorioLojistaMock.buscar.mockResolvedValue(proprio);
        repositorioEnderecoMock.buscarPorId.mockResolvedValue({ id: 9, usuarioId: 99 });

        await expect(
            servico.atualizar(
                "5",
                { id: 20, role: Role.LOJISTA },
                {
                    nomeFantasia: "Loja",
                    razaoSocial: "Loja LTDA",
                    cnpj: "12.345.678/0001-90",
                    enderecoId: 9,
                },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioLojistaMock.atualizar).not.toHaveBeenCalled();
    });
});
