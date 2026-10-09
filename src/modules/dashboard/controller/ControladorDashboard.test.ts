import { beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";
import { Associacao } from "../../associacao/model/Associacao";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { Role } from "../../auth/enum/Role";
import { ControladorDashboard } from "./ControladorDashboard";
import { ServicoDashboard } from "../service/ServicoDashboard";

describe("ControladorDashboard", () => {
    let servicoMock: { resumo: ReturnType<typeof vi.fn> };
    let repositorioAssociacaoMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let controlador: ControladorDashboard;

    beforeEach(() => {
        servicoMock = {
            resumo: vi.fn().mockResolvedValue({
                metricas: {
                    lojasAguardandoAprovacao: 1,
                    campanhasCadastradas: 2,
                    sorteiosCadastrados: 3,
                    totalLojasParticipantes: 4,
                },
                atividadesRecentes: [],
            }),
        };
        repositorioAssociacaoMock = {
            buscarPorUsuarioId: vi.fn().mockResolvedValue(
                new Associacao({
                    id: 77,
                    nomeFantasia: "Assoc A",
                    razaoSocial: "Assoc A LTDA",
                    cnpj: "11.111.111/0001-11",
                    inscricaoEstadual: null,
                    usuarioId: 10,
                    dataCriacao: new Date(),
                    dataAtualizacao: new Date(),
                }),
            ),
        };
        controlador = new ControladorDashboard(
            servicoMock as unknown as ServicoDashboard,
            repositorioAssociacaoMock as unknown as RepositorioAssociacao,
        );
    });

    it("resolve associacaoId do usuario e passa ao ServicoDashboard.resumo", async () => {
        const request = {
            usuario: { id: 10, role: Role.ASSOCIACAO },
        } as Request;
        const response = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as unknown as Response;

        await controlador.resumo(request, response, vi.fn());

        expect(repositorioAssociacaoMock.buscarPorUsuarioId).toHaveBeenCalledWith(10);
        expect(servicoMock.resumo).toHaveBeenCalledWith(77);
        expect(response.status).toHaveBeenCalledWith(200);
    });
});
