import { beforeEach, describe, expect, it, vi } from "vitest";
import { Lojista } from "../model/Lojista";
import { ServicoLojista } from "./ServicoLojista";

const criarLoja = (urlLogo: string | null = null) => new Lojista({
    id: 1, usuarioId: 10, associacaoId: 2, nomeFantasia: "Loja", razaoSocial: "Loja Ltda",
    cnpj: "00.000.000/0001-00", inscricaoEstadual: null, status: "PENDENTE", enderecoId: null,
    justificativaRejeicao: null, dataCriacao: new Date(), dataAtualizacao: new Date(), urlLogo,
});

describe("logo da loja", () => {
    const repositorio = { buscar: vi.fn(), definirLogo: vi.fn(), listar: vi.fn() };
    const upload = { gravar: vi.fn(), remover: vi.fn() };
    const servico = new ServicoLojista(repositorio as never, {} as never, {} as never, {} as never, undefined, upload as never);
    const arquivo = Buffer.from("imagem");
    beforeEach(() => {
        vi.resetAllMocks();
        repositorio.buscar.mockResolvedValue(criarLoja());
        repositorio.definirLogo.mockResolvedValue(criarLoja("/uploads/lojistas/nova.png"));
        upload.gravar.mockResolvedValue("/uploads/lojistas/nova.png");
        upload.remover.mockResolvedValue(undefined);
    });
    it("salva logo do próprio lojista sem alterar status de aprovação", async () => {
        const resposta = await servico.definirLogo(10, "1", arquivo);
        expect(upload.gravar).toHaveBeenCalledWith("lojistas", arquivo);
        expect(repositorio.definirLogo).toHaveBeenCalledWith(1, "/uploads/lojistas/nova.png");
        expect(resposta).toMatchObject({ urlLogo: "/uploads/lojistas/nova.png", status: "PENDENTE" });
    });
    it("bloqueia outra loja antes de gravar arquivo", async () => {
        await expect(servico.definirLogo(20, "1", arquivo)).rejects.toMatchObject({ statusCode: 404 });
        expect(upload.gravar).not.toHaveBeenCalled();
        expect(repositorio.definirLogo).not.toHaveBeenCalled();
    });
    it("trata loja inexistente", async () => {
        repositorio.buscar.mockResolvedValue(null);
        await expect(servico.definirLogo(10, "1", arquivo)).rejects.toMatchObject({ statusCode: 404 });
        expect(upload.gravar).not.toHaveBeenCalled();
    });
    it("propaga formato/tamanho inválidos sem mudar o cadastro", async () => {
        upload.gravar.mockRejectedValue(new Error("Formato invalido"));
        await expect(servico.definirLogo(10, "1", arquivo)).rejects.toThrow("Formato invalido");
        expect(repositorio.definirLogo).not.toHaveBeenCalled();
        expect(upload.remover).not.toHaveBeenCalled();
    });
    it("preserva a logo anterior e limpa a nova se falhar a persistência", async () => {
        repositorio.buscar.mockResolvedValue(criarLoja("/uploads/lojistas/anterior.png"));
        repositorio.definirLogo.mockRejectedValue(new Error("Banco indisponivel"));
        await expect(servico.definirLogo(10, "1", arquivo)).rejects.toThrow("Banco indisponivel");
        expect(upload.remover).toHaveBeenCalledExactlyOnceWith("/uploads/lojistas/nova.png");
    });
    it("substitui a logo antiga somente após salvar a nova", async () => {
        repositorio.buscar.mockResolvedValue(criarLoja("/uploads/lojistas/anterior.png"));
        await servico.definirLogo(10, "1", arquivo);
        expect(upload.remover).toHaveBeenCalledWith("/uploads/lojistas/anterior.png");
        expect(repositorio.definirLogo.mock.invocationCallOrder[0]).toBeLessThan(upload.remover.mock.invocationCallOrder[0]);
    });
    it("não apaga a foto compartilhada da demonstração", async () => {
        repositorio.buscar.mockResolvedValue(criarLoja("/uploads/demo-completa/padaria.jpg"));
        await servico.definirLogo(10, "1", arquivo);
        expect(upload.remover).not.toHaveBeenCalled();
    });
    it("expõe a logo no catálogo e no detalhe sem dados privados", async () => {
        const loja = criarLoja("/uploads/lojistas/logo.png");
        const aprovada = new Lojista({ ...{
            id: loja.id, usuarioId: loja.usuarioId, associacaoId: loja.associacaoId, nomeFantasia: loja.nomeFantasia,
            razaoSocial: loja.razaoSocial, cnpj: loja.cnpj, inscricaoEstadual: null, enderecoId: null,
            justificativaRejeicao: null, dataCriacao: loja.dataCriacao, dataAtualizacao: loja.dataAtualizacao,
        }, status: "APROVADO", urlLogo: loja.urlLogo });
        repositorio.listar.mockResolvedValue([aprovada]);
        repositorio.buscar.mockResolvedValue(aprovada);
        const catalogo = await servico.listarCatalogo();
        const detalhe = await servico.buscarCatalogo("1");
        expect(catalogo[0].urlLogo).toBe(loja.urlLogo);
        expect(detalhe.urlLogo).toBe(loja.urlLogo);
        expect(catalogo[0]).not.toHaveProperty("cnpj");
        expect(detalhe).not.toHaveProperty("email");
    });
});
