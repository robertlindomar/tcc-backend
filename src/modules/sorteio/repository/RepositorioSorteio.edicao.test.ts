import { describe, expect, it, vi } from "vitest";
import { RepositorioSorteio } from "./RepositorioSorteio";

const AGORA = new Date("2026-10-05T12:00:00.000Z");

function preparar(ticket: { campanhaId: number; edicao: number; numero: number } | null) {
    const tx = {
        sorteio: { findUnique: vi.fn().mockResolvedValue({ campanhaId: 10, edicao: 1 }) },
        ticket: { findUnique: vi.fn().mockResolvedValue(ticket) },
        resultadoSorteio: { create: vi.fn(), updateMany: vi.fn() },
    };
    const prisma = {
        $transaction: async (fn: (cliente: typeof tx) => Promise<unknown>) => fn(tx),
        ticket: {
            findUnique: vi.fn().mockResolvedValue({ id: 55 }),
        },
    };
    return { repo: new RepositorioSorteio(prisma as never), tx, prisma };
}

describe("RepositorioSorteio — isolamento por edição", () => {
    it("busca o ticket pela chave campanha + edição + número", async () => {
        const { repo, prisma } = preparar(null);

        await expect(repo.buscarTicketIdPorNumero(10, 2, 7)).resolves.toBe(55);
        expect(prisma.ticket.findUnique).toHaveBeenCalledWith({
            where: { campanhaId_edicao_numero: { campanhaId: 10, edicao: 2, numero: 7 } },
            select: { id: true },
        });
    });

    it("registra resultado quando o ticket é da mesma campanha e edição", async () => {
        const { repo, tx } = preparar({ campanhaId: 10, edicao: 1, numero: 3 });

        await repo.registrarResultado({
            sorteioId: 1,
            ticketId: 103,
            numeroSorteado: 3,
            totalTickets: 5,
            agora: AGORA,
        });

        expect(tx.resultadoSorteio.create).toHaveBeenCalled();
    });

    it.each([
        ["outra edição", { campanhaId: 10, edicao: 2, numero: 3 }],
        ["outra campanha", { campanhaId: 11, edicao: 1, numero: 3 }],
        ["número divergente", { campanhaId: 10, edicao: 1, numero: 4 }],
    ])("recusa vencedor de %s com 409", async (_caso, ticket) => {
        const { repo, tx } = preparar(ticket);

        await expect(
            repo.registrarResultado({
                sorteioId: 1,
                ticketId: 103,
                numeroSorteado: 3,
                totalTickets: 5,
                agora: AGORA,
            }),
        ).rejects.toMatchObject({ statusCode: 409, detalhes: { codigo: "TICKET_EDICAO_INVALIDA" } });
        expect(tx.resultadoSorteio.create).not.toHaveBeenCalled();
    });
});
