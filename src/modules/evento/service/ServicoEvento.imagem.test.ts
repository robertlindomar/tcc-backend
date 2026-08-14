import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusLojista } from "../../../generated/prisma/enums";
import { ServicoUploadImagem } from "../../../shared/upload/ServicoUploadImagem";
import { lojistaFake } from "../../../shared/testes/lojistaFake";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { Evento } from "../model/Evento";
import { RepositorioEvento } from "../repository/RepositorioEvento";
import { ServicoEvento } from "./ServicoEvento";

const jpegMinimo = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

function eventoFake(agora: Date, overrides: { lojistaId?: number; urlImagem?: string | null } = {}) {
    return new Evento({
        id: 3,
        nome: "Feira",
        descricao: null,
        lojistaId: overrides.lojistaId ?? 5,
        urlImagem: overrides.urlImagem ?? null,
        dataCriacao: agora,
        dataAtualizacao: agora,
    });
}

describe("ServicoEvento imagem", () => {
    const agora = new Date();
    let repositorioEventoMock: {
        buscar: ReturnType<typeof vi.fn>;
        atualizar: ReturnType<typeof vi.fn>;
        criar: ReturnType<typeof vi.fn>;
    };
    let repositorioLojistaMock: { buscarPorUsuarioId: ReturnType<typeof vi.fn> };
    let uploadMock: { gravar: ReturnType<typeof vi.fn>; remover: ReturnType<typeof vi.fn> };
    let servico: ServicoEvento;

    beforeEach(() => {
        repositorioEventoMock = {
            buscar: vi.fn(),
            atualizar: vi.fn(),
            criar: vi.fn(),
        };
        repositorioLojistaMock = { buscarPorUsuarioId: vi.fn() };
        uploadMock = { gravar: vi.fn(), remover: vi.fn() };
        servico = new ServicoEvento(
            repositorioEventoMock as unknown as RepositorioEvento,
            repositorioLojistaMock as unknown as RepositorioLojista,
            uploadMock as unknown as ServicoUploadImagem,
        );
    });

    it("cria evento sem imagem", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioEventoMock.criar.mockResolvedValue(eventoFake(agora));
        const resultado = await servico.criar(20, { nome: "Feira" });
        expect(resultado.urlImagem).toBeNull();
    });

    it("grava imagem opcional do evento", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioEventoMock.buscar.mockResolvedValue(eventoFake(agora));
        uploadMock.gravar.mockResolvedValue("/uploads/eventos/a.jpg");
        repositorioEventoMock.atualizar.mockResolvedValue(
            eventoFake(agora, { urlImagem: "/uploads/eventos/a.jpg" }),
        );

        const resultado = await servico.definirImagem(20, "3", jpegMinimo);
        expect(resultado.urlImagem).toBe("/uploads/eventos/a.jpg");
        expect(uploadMock.gravar).toHaveBeenCalledWith("eventos", jpegMinimo);
    });

    it("nao altera imagem de evento de outro lojista", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.APROVADO, id: 5 }),
        );
        repositorioEventoMock.buscar.mockResolvedValue(eventoFake(agora, { lojistaId: 8 }));
        await expect(servico.definirImagem(20, "3", jpegMinimo)).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    it("REJEITADO nao envia imagem", async () => {
        repositorioLojistaMock.buscarPorUsuarioId.mockResolvedValue(
            lojistaFake({ status: StatusLojista.REJEITADO }),
        );
        await expect(servico.definirImagem(20, "3", jpegMinimo)).rejects.toMatchObject({
            statusCode: 403,
        });
    });
});
