import { describe, expect, it, vi } from "vitest";
import { FrequenciaMissao } from "../../../generated/prisma/enums";
import { RepositorioMissao } from "./RepositorioMissao";
import {
    NOME_MISSAO_VISITA_LOJA,
    PONTOS_MISSAO_VISITA_LOJA,
} from "../constantes/missaoSistema";

describe("RepositorioMissao.garantirSistemaVisitarLoja", () => {
    it("nao duplica quando ja existe missao de sistema", async () => {
        const existente = {
            id: 9,
            nome: NOME_MISSAO_VISITA_LOJA,
            descricao: null,
            pontoRecompensa: PONTOS_MISSAO_VISITA_LOJA,
            frequencia: FrequenciaMissao.DIARIA,
            dataFim: null,
            sistema: true,
            lojistaId: 4,
            tokenQr: "ab".repeat(32),
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        };
        const prisma = {
            missao: {
                findFirst: vi.fn().mockResolvedValue(existente),
                create: vi.fn(),
            },
        };
        const repo = new RepositorioMissao(prisma as never);
        const resultado = await repo.garantirSistemaVisitarLoja(4);
        expect(resultado.sistema).toBe(true);
        expect(resultado.tokenQr).toBe(existente.tokenQr);
        expect(prisma.missao.create).not.toHaveBeenCalled();
    });

    it("P2002 da UNIQUE parcial reutiliza a missao existente", async () => {
        const existente = {
            id: 9,
            nome: NOME_MISSAO_VISITA_LOJA,
            descricao: null,
            pontoRecompensa: 5,
            frequencia: FrequenciaMissao.DIARIA,
            dataFim: null,
            sistema: true,
            lojistaId: 4,
            tokenQr: "cd".repeat(32),
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        };
        const prisma = {
            missao: {
                findFirst: vi
                    .fn()
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce(existente),
                create: vi.fn().mockRejectedValue({ code: "P2002" }),
            },
        };
        const repo = new RepositorioMissao(prisma as never);
        const resultado = await repo.garantirSistemaVisitarLoja(4);
        expect(resultado.id).toBe(9);
        expect(resultado.sistema).toBe(true);
    });
});
