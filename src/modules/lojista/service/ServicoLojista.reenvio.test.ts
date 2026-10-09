import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Role } from "../../auth/enum/Role";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "./ServicoLojista";

const MOTIVO_A = "CNPJ informado esta incorreto.";
const MOTIVO_B = "Endereco incompleto.";

function associacaoDaLogada(): Associacao {
    const agora = new Date();
    return new Associacao({
        id: 1,
        nomeFantasia: "Assoc",
        razaoSocial: "Assoc LTDA",
        cnpj: "11.111.111/0001-01",
        inscricaoEstadual: null,
        usuarioId: 1,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoLojista reenvio para analise", () => {
    let repositorioLojistaMock: {
        buscar: ReturnType<typeof vi.fn>;
        atualizarStatus: ReturnType<typeof vi.fn>;
    };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let servico: ServicoLojista;

    beforeEach(() => {
        repositorioLojistaMock = {
            buscar: vi.fn(),
            atualizarStatus: vi.fn(),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(associacaoDaLogada()),
        };
        servico = new ServicoLojista(
            repositorioLojistaMock as unknown as RepositorioLojista,
            {} as RepositorioUsuario,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
            {} as never,
        );
    });

    it("REJEITADO reenvia para PENDENTE e preserva justificativa", async () => {
        const rejeitado = lojistaFake({
            status: StatusLojista.REJEITADO,
            id: 5,
            justificativaRejeicao: MOTIVO_A,
        });
        repositorioLojistaMock.buscar.mockResolvedValue(rejeitado);
        repositorioLojistaMock.atualizarStatus.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.PENDENTE,
                id: 5,
                justificativaRejeicao: MOTIVO_A,
            }),
        );

        const resultado = await servico.reenviarParaAnalise("5", {
            id: 20,
            role: Role.LOJISTA,
        });

        expect(repositorioLojistaMock.atualizarStatus).toHaveBeenCalledWith(5, {
            status: StatusLojista.PENDENTE,
        });
        expect(repositorioLojistaMock.atualizarStatus.mock.calls[0][1]).not.toHaveProperty(
            "justificativaRejeicao",
        );
        expect(resultado.status).toBe(StatusLojista.PENDENTE);
        expect(resultado.justificativaRejeicao).toBe(MOTIVO_A);
    });

    it("outro lojista nao reenvia cadastro alheio", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO, id: 5 }),
        );

        await expect(
            servico.reenviarParaAnalise("5", { id: 99, role: Role.LOJISTA }),
        ).rejects.toMatchObject({
            statusCode: 403,
            message: "Acesso nao autorizado a este recurso",
        });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });

    it("associacao nao reenvia pelo servico", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO, id: 5 }),
        );

        await expect(
            servico.reenviarParaAnalise("5", { id: 1, role: Role.ASSOCIACAO }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });

    it("PENDENTE nao reenvia", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5 }),
        );

        await expect(
            servico.reenviarParaAnalise("5", { id: 20, role: Role.LOJISTA }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: "Cadastro ja esta em analise",
        });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });

    it("APROVADO nao reenvia", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );

        await expect(
            servico.reenviarParaAnalise("5", { id: 20, role: Role.LOJISTA }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: "Cadastro ja foi aprovado",
        });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });

    it("reenvio depois aprovacao limpa justificativa", async () => {
        const pendenteAposReenvio = lojistaFake({
            status: StatusLojista.PENDENTE,
            id: 5,
            associacaoId: 1,
            justificativaRejeicao: MOTIVO_A,
        });
        repositorioLojistaMock.buscar.mockResolvedValue(pendenteAposReenvio);
        repositorioLojistaMock.atualizarStatus.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.APROVADO,
                id: 5,
                justificativaRejeicao: null,
            }),
        );

        const resultado = await servico.aprovar("5", 1);

        expect(repositorioLojistaMock.atualizarStatus).toHaveBeenCalledWith(5, {
            status: StatusLojista.APROVADO,
            justificativaRejeicao: null,
        });
        expect(resultado.status).toBe(StatusLojista.APROVADO);
        expect(resultado.justificativaRejeicao).toBeNull();
    });

    it("rejeicao nova substitui justificativa apos reenvio", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.PENDENTE,
                id: 5,
                associacaoId: 1,
                justificativaRejeicao: MOTIVO_A,
            }),
        );
        repositorioLojistaMock.atualizarStatus.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.REJEITADO,
                id: 5,
                justificativaRejeicao: MOTIVO_B,
            }),
        );

        const resultado = await servico.rejeitar("5", 1, {
            justificativaRejeicao: MOTIVO_B,
        });

        expect(repositorioLojistaMock.atualizarStatus).toHaveBeenCalledWith(5, {
            status: StatusLojista.REJEITADO,
            justificativaRejeicao: MOTIVO_B,
        });
        expect(resultado.justificativaRejeicao).toBe(MOTIVO_B);
    });
});
