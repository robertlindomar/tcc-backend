import { beforeEach, describe, expect, it, vi } from "vitest";
import { Consumidor } from "../../modules/consumidor/model/Consumidor";
import { RepositorioConsumidor } from "../../modules/consumidor/repository/RepositorioConsumidor";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { resolverConsumidorLogado } from "./resolverConsumidorLogado";

function consumidorFake(id = 5, usuarioId = 30): Consumidor {
    const agora = new Date();
    return new Consumidor({
        id,
        cpf: "123.456.789-00",
        pontos: 0,
        nivel: 1,
        sexoId: null,
        lojistaId: null,
        usuarioId,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("resolverConsumidorLogado", () => {
    let repositorioMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        repositorioMock = {
            buscarPorUsuarioId: vi.fn(),
        };
    });

    it("retorna 404 quando consumidor nao existe para o usuario", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(null);

        const promessa = resolverConsumidorLogado(
            repositorioMock as unknown as RepositorioConsumidor,
            30,
        );

        await expect(promessa).rejects.toBeInstanceOf(ErroAplicacao);
        await expect(promessa).rejects.toMatchObject({
            message: "Consumidor nao encontrado para o usuario logado",
            statusCode: 404,
        });
        expect(repositorioMock.buscarPorUsuarioId).toHaveBeenCalledWith(30);
    });

    it("retorna consumidorId quando perfil existe", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(consumidorFake(12, 30));

        const resultado = await resolverConsumidorLogado(
            repositorioMock as unknown as RepositorioConsumidor,
            30,
        );

        expect(resultado).toEqual({ consumidorId: 12 });
    });
});
