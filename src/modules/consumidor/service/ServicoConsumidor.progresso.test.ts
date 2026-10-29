import { describe, expect, it, vi } from "vitest";
import { Role } from "../../auth/enum/Role";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { RepositorioSexo } from "../../sexo/repository/RepositorioSexo";
import { Usuario } from "../../usuario/model/Usuario";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { Consumidor } from "../model/Consumidor";
import { RepositorioConsumidor } from "../repository/RepositorioConsumidor";
import { ServicoConsumidor } from "./ServicoConsumidor";

const agora = new Date("2026-10-28T20:00:00.000Z");

function criarServico(pontos: number, pontosGastos: number) {
    const repositorioConsumidor = {
        buscarPorUsuarioId: vi.fn().mockResolvedValue(
            new Consumidor({
                id: 20, cpf: "222.333.444-55", pontos, nivel: 1, sexoId: null, lojistaId: null,
                usuarioId: 10, dataCriacao: agora, dataAtualizacao: agora,
            }),
        ),
        buscarEstatisticasProgresso: vi.fn().mockResolvedValue({
            pontosGastos,
            resgates: 2,
            missoesConcluidas: 7,
            lojasVisitadas: 3,
            notasLidas: 4,
            ticketsCampanhasAtivas: 66,
        }),
    };
    const repositorioUsuario = {
        buscar: vi.fn().mockResolvedValue(
            new Usuario({
                id: 10, nome: "Bruno", email: "b@demo.local", senha: "hash", role: Role.CONSUMIDOR,
                ativo: true, dataCriacao: agora, dataAtualizacao: agora,
            }),
        ),
    };
    const servico = new ServicoConsumidor(
        repositorioConsumidor as unknown as RepositorioConsumidor,
        repositorioUsuario as unknown as RepositorioUsuario,
        {} as RepositorioEndereco,
        {} as RepositorioSexo,
        {} as RepositorioLojista,
    );
    return { servico, repositorioConsumidor };
}

describe("ServicoConsumidor.buscarProgressoAtual", () => {
    it("XP soma saldo e pontos já gastos: resgatar não reduz XP", async () => {
        const { servico, repositorioConsumidor } = criarServico(40, 210);

        const progresso = await servico.buscarProgressoAtual({ id: 10, role: Role.CONSUMIDOR });

        expect(repositorioConsumidor.buscarEstatisticasProgresso).toHaveBeenCalledWith(20);
        expect(progresso).toEqual({
            pontos: 40,
            pontosGastos: 210,
            xp: 250,
            nivel: 3,
            xpInicioNivel: 200,
            xpProximoNivel: 300,
            missoesConcluidas: 7,
            lojasVisitadas: 3,
            notasLidas: 4,
            resgates: 2,
            ticketsCampanhasAtivas: 66,
        });
    });

    it("sem gastos o XP é igual ao saldo", async () => {
        const { servico } = criarServico(0, 0);

        const progresso = await servico.buscarProgressoAtual({ id: 10, role: Role.CONSUMIDOR });

        expect(progresso).toMatchObject({ xp: 0, nivel: 1, xpInicioNivel: 0, xpProximoNivel: 100 });
    });

    it("recusa perfil que não é consumidor", async () => {
        const { servico } = criarServico(0, 0);

        await expect(servico.buscarProgressoAtual({ id: 10, role: Role.LOJISTA })).rejects.toMatchObject({
            statusCode: 403,
        });
    });
});
