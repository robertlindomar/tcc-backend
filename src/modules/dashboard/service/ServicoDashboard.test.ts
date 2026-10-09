import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResumoDashboard } from "../dtos/ResumoDashboard";
import { CandidatoAtividade, RepositorioDashboard } from "../repository/RepositorioDashboard";
import { ServicoDashboard } from "./ServicoDashboard";

describe("ServicoDashboard", () => {
    let repositorioMock: {
        contarLojasAguardandoAprovacao: ReturnType<typeof vi.fn>;
        contarCampanhasCadastradas: ReturnType<typeof vi.fn>;
        contarSorteiosCadastrados: ReturnType<typeof vi.fn>;
        contarLojasParticipantes: ReturnType<typeof vi.fn>;
        listarCandidatosAtividades: ReturnType<typeof vi.fn>;
    };
    let servico: ServicoDashboard;

    beforeEach(() => {
        repositorioMock = {
            contarLojasAguardandoAprovacao: vi.fn().mockResolvedValue(12),
            contarCampanhasCadastradas: vi.fn().mockResolvedValue(5),
            contarSorteiosCadastrados: vi.fn().mockResolvedValue(3),
            contarLojasParticipantes: vi.fn().mockResolvedValue(128),
            listarCandidatosAtividades: vi.fn().mockResolvedValue([]),
        };
        servico = new ServicoDashboard(
            repositorioMock as unknown as RepositorioDashboard,
        );
    });

    it("resumo chama o repositorio apenas com o associacaoId informado", async () => {
        await servico.resumo(7);

        expect(repositorioMock.contarLojasAguardandoAprovacao).toHaveBeenCalledWith(7);
        expect(repositorioMock.contarCampanhasCadastradas).toHaveBeenCalledWith(7);
        expect(repositorioMock.contarSorteiosCadastrados).toHaveBeenCalledWith(7);
        expect(repositorioMock.contarLojasParticipantes).toHaveBeenCalledWith(7);
        expect(repositorioMock.listarCandidatosAtividades).toHaveBeenCalledWith(7);
    });

    it("retorna metricas no contrato ResumoDashboard", async () => {
        const resultado = await servico.resumo(7);

        expect(resultado).toEqual<ResumoDashboard>({
            metricas: {
                lojasAguardandoAprovacao: 12,
                campanhasCadastradas: 5,
                sorteiosCadastrados: 3,
                totalLojasParticipantes: 128,
            },
            atividadesRecentes: [],
        });
    });

    it("ordena atividades por ocorridoEm DESC e limita a 10", async () => {
        const base = new Date("2026-05-01T12:00:00.000Z").getTime();
        const candidatos: CandidatoAtividade[] = Array.from({ length: 12 }, (_, i) => ({
            tipo: "CAMPANHA_CRIADA" as const,
            entidadeId: i + 1,
            titulo: `Campanha ${i + 1}`,
            ocorridoEm: new Date(base + i * 60_000),
        }));
        repositorioMock.listarCandidatosAtividades.mockResolvedValue(candidatos);

        const resultado = await servico.resumo(7);

        expect(resultado.atividadesRecentes).toHaveLength(10);
        expect(resultado.atividadesRecentes[0]).toMatchObject({
            entidadeId: 12,
            ocorridoEm: new Date(base + 11 * 60_000).toISOString(),
        });
        expect(resultado.atividadesRecentes[9]).toMatchObject({
            entidadeId: 3,
        });
    });
});
