import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioAvisoSorteio } from "./RepositorioAvisoSorteio";
import { ServicoAvisoSorteio } from "./ServicoAvisoSorteio";

const resultado = {
    id: 7, numeroSorteado: 42, situacao: "AGUARDANDO_ENTREGA", dataSorteio: new Date("2026-10-06T12:00:00Z"), dataConfirmacaoLeitura: null,
    sorteio: { id: 3, campanha: { id: 1, nome: "Campanha", descricao: null, associacao: { nomeFantasia: "Associação" } } },
    ticket: { consumidorId: 9, consumidor: { usuario: { nome: "Maria", email: "privado@example.com", cpf: "12345678909" } } },
};

describe("Avisos de sorteio para consumidores", () => {
    const repositorio = { listarVisiveis: vi.fn(), buscar: vi.fn(), ocultar: vi.fn(), confirmarLeitura: vi.fn() };
    const consumidores = { buscarPorUsuarioId: vi.fn() };
    const servico = new ServicoAvisoSorteio(repositorio as unknown as RepositorioAvisoSorteio, consumidores as unknown as RepositorioConsumidor, () => new Date("2026-10-06T12:00:00Z"));
    beforeEach(() => {
        vi.resetAllMocks();
        consumidores.buscarPorUsuarioId.mockResolvedValue({ id: 9 });
        repositorio.listarVisiveis.mockResolvedValue([resultado]);
        repositorio.buscar.mockResolvedValue(resultado);
    });
    it("anuncia o vencedor e identifica o próprio ganhador sem expor contato ou CPF", async () => {
        const [aviso] = await servico.listar(20);
        expect(aviso).toMatchObject({ resultadoId: 7, nomeVencedor: "Maria", souVencedor: true });
        expect(JSON.stringify(aviso)).not.toContain("privado@example.com");
        expect(JSON.stringify(aviso)).not.toContain("12345678909");
        expect(repositorio.listarVisiveis).toHaveBeenCalledWith(9);
    });
    it("outro consumidor recebe o anúncio sem ser marcado como ganhador", async () => {
        consumidores.buscarPorUsuarioId.mockResolvedValue({ id: 10 });
        expect((await servico.listar(21))[0].souVencedor).toBe(false);
    });
    it("não aceita consumidorId enviado pelo cliente; oculta para o perfil autenticado", async () => {
        consumidores.buscarPorUsuarioId.mockResolvedValue({ id: 10 });
        await servico.ocultar(20, "7");
        expect(repositorio.ocultar).toHaveBeenCalledWith(7, 10);
    });
    it.each([null, { ...resultado, situacao: "CANCELADO" }])("não oculta resultado inexistente/cancelado", async (atual) => {
        repositorio.buscar.mockResolvedValue(atual);
        await expect(servico.ocultar(20, "7")).rejects.toMatchObject({ statusCode: 404 });
        expect(repositorio.ocultar).not.toHaveBeenCalled();
    });
    it("perfil ausente bloqueia a listagem", async () => {
        consumidores.buscarPorUsuarioId.mockResolvedValue(null);
        await expect(servico.listar(20)).rejects.toMatchObject({ statusCode: 404 });
    });
    it.each(["0", "-1", "abc", "1.2"])("rejeita ID inválido %s", async (id) => {
        await expect(servico.ocultar(20, id)).rejects.toMatchObject({ statusCode: 400 });
    });
    it("apenas o ganhador confirma a leitura", async () => {
        consumidores.buscarPorUsuarioId.mockResolvedValue({ id: 10 });
        await expect(servico.confirmarLeitura(21, "7")).rejects.toMatchObject({ statusCode: 404 });
        expect(repositorio.confirmarLeitura).not.toHaveBeenCalled();
    });
    it("confirma a leitura mantendo o prazo original", async () => {
        const lido = { ...resultado, dataConfirmacaoLeitura: new Date("2026-10-06T12:00:00Z") };
        repositorio.confirmarLeitura.mockResolvedValue(lido);
        expect(await servico.confirmarLeitura(20, "7")).toEqual({ dataConfirmacaoLeitura: lido.dataConfirmacaoLeitura });
    });
    it("ganhador não oculta a ação antes de confirmar que viu", async () => {
        await expect(servico.ocultar(20, "7")).rejects.toMatchObject({ statusCode: 409 });
    });
    it("leitura após a semana é recusada", async () => {
        repositorio.buscar.mockResolvedValue({ ...resultado, dataSorteio: new Date("2026-09-28T12:00:00Z") });
        await expect(servico.confirmarLeitura(20, "7")).rejects.toMatchObject({ detalhes: { codigo: "PRAZO_RETIRADA_ENCERRADO" } });
    });
    it("resultado cancelado durante confirmação não vira leitura confirmada", async () => {
        repositorio.confirmarLeitura.mockResolvedValue({ ...resultado, situacao: "CANCELADO" });
        await expect(servico.confirmarLeitura(20, "7")).rejects.toMatchObject({ statusCode: 409 });
    });

});
