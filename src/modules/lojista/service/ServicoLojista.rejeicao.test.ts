import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Role } from "../../auth/enum/Role";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "./ServicoLojista";

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

describe("ServicoLojista justificativa de rejeicao", () => {
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
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({ status: StatusLojista.PENDENTE, id: 5, associacaoId: 1 }),
        );
    });

    it("rejeita sem justificativa com 400", async () => {
        await expect(
            servico.rejeitar("5", 1, { justificativaRejeicao: "" }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Justificativa da rejeicao e obrigatoria",
        });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });

    it("rejeita somente espacos com 400", async () => {
        await expect(
            servico.rejeitar("5", 1, { justificativaRejeicao: "     " }),
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(repositorioLojistaMock.atualizarStatus).not.toHaveBeenCalled();
    });

    it("rejeita com motivo valido e persiste justificativa", async () => {
        const motivo = "CNPJ informado esta incorreto.";
        repositorioLojistaMock.atualizarStatus.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.REJEITADO,
                id: 5,
                justificativaRejeicao: motivo,
            }),
        );

        const resultado = await servico.rejeitar("5", 1, {
            justificativaRejeicao: `  ${motivo}  `,
        });

        expect(repositorioLojistaMock.atualizarStatus).toHaveBeenCalledWith(5, {
            status: StatusLojista.REJEITADO,
            justificativaRejeicao: motivo,
        });
        expect(resultado.status).toBe(StatusLojista.REJEITADO);
        expect(resultado.justificativaRejeicao).toBe(motivo);
    });

    it("aprovar limpa justificativaRejeicao", async () => {
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.REJEITADO,
                id: 5,
                justificativaRejeicao: "motivo antigo",
            }),
        );
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

    it("lojista REJEITADO consulta propria loja e recebe justificativa", async () => {
        const motivo = "Endereco incompleto.";
        repositorioLojistaMock.buscar.mockResolvedValue(
            lojistaFake({
                status: StatusLojista.REJEITADO,
                id: 5,
                justificativaRejeicao: motivo,
            }),
        );

        const resultado = await servico.buscar("5", { id: 20, role: Role.LOJISTA });

        expect(resultado.status).toBe(StatusLojista.REJEITADO);
        expect(resultado.justificativaRejeicao).toBe(motivo);
    });
});
