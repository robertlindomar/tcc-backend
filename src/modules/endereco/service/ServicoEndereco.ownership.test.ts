import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RespostaEndereco } from "../dtos/RespostaEndereco";
import { RepositorioEndereco } from "../repository/RepositorioEndereco";
import { ServicoAtualizarEndereco } from "./ServicoAtualizarEndereco";
import { ServicoCriarEndereco } from "./ServicoCriarEndereco";
import { ServicoDeletarEndereco } from "./ServicoDeletarEndereco";
import { ServicoEncontrarEnderecoPorUsuario } from "./ServicoEncontrarEnderecoPorUsuario";

function enderecoFake(id: number, usuarioId: number): RespostaEndereco {
    const agora = new Date();
    return {
        id,
        cep: "01001-000",
        numero: "100",
        usuarioId,
        rua: { id: 1, nome: "Rua A" },
        bairro: { id: 1, nome: "Centro" },
        cidade: { id: 1, nome: "Sao Paulo" },
        estado: { id: 1, nome: "Sao Paulo", uf: "SP" },
        dataCriacao: agora,
        dataAtualizacao: agora,
    };
}

describe("ServicoEndereco ownership", () => {
    let repositorioMock: {
        buscarPorId: ReturnType<typeof vi.fn>;
        buscarPorUsuarioId: ReturnType<typeof vi.fn>;
        existePorUsuarioId: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        deletar: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        repositorioMock = {
            buscarPorId: vi.fn(),
            buscarPorUsuarioId: vi.fn(),
            existePorUsuarioId: vi.fn(),
            criar: vi.fn(),
            atualizar: vi.fn(),
            deletar: vi.fn(),
        };
    });

    it("usuario A consulta o proprio endereco", async () => {
        repositorioMock.buscarPorUsuarioId.mockResolvedValue(enderecoFake(1, 10));
        const servico = new ServicoEncontrarEnderecoPorUsuario(
            repositorioMock as unknown as RepositorioEndereco,
        );

        const resultado = await servico.executar("10", 10);

        expect(resultado.usuarioId).toBe(10);
    });

    it("usuario A nao consulta endereco de B", async () => {
        const servico = new ServicoEncontrarEnderecoPorUsuario(
            repositorioMock as unknown as RepositorioEndereco,
        );

        await expect(servico.executar("11", 10)).rejects.toMatchObject({
            statusCode: 403,
        } satisfies Partial<ErroAplicacao>);
        expect(repositorioMock.buscarPorUsuarioId).not.toHaveBeenCalled();
    });

    it("usuario A nao edita endereco de B", async () => {
        repositorioMock.buscarPorId.mockResolvedValue(enderecoFake(2, 11));
        const servico = new ServicoAtualizarEndereco(
            {} as never,
            repositorioMock as unknown as RepositorioEndereco,
            {} as never,
        );

        await expect(servico.executar("2", 10, { numero: "999" })).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioMock.atualizar).not.toHaveBeenCalled();
    });

    it("usuario A nao deleta endereco de B", async () => {
        repositorioMock.buscarPorId.mockResolvedValue(enderecoFake(2, 11));
        const servico = new ServicoDeletarEndereco(
            repositorioMock as unknown as RepositorioEndereco,
        );

        await expect(servico.executar("2", 10)).rejects.toMatchObject({
            statusCode: 403,
        });
        expect(repositorioMock.deletar).not.toHaveBeenCalled();
    });

    it("usuario A enviar usuarioId de B no body nao assume propriedade de B", async () => {
        const servico = new ServicoCriarEndereco(
            {
                usuario: { findUnique: vi.fn() },
                $transaction: vi.fn(),
            } as never,
            repositorioMock as unknown as RepositorioEndereco,
            {} as never,
        );

        await expect(
            servico.executar(10, { cep: "01001000", numero: "10", usuarioId: 11 }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(repositorioMock.existePorUsuarioId).not.toHaveBeenCalled();
        expect(repositorioMock.criar).not.toHaveBeenCalled();
    });
});
