import { describe, expect, it, vi } from "vitest";
import { RepositorioAssociacao } from "../../associacao/repository/RepositorioAssociacao";
import { RepositorioEndereco } from "../../endereco/repository/RepositorioEndereco";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { RepositorioLojista } from "../repository/RepositorioLojista";
import { ServicoLojista } from "./ServicoLojista";

function criarServico(lojas: unknown[]) {
    const repositorioLojista = { listarAprovadasComOfertasVigentes: vi.fn().mockResolvedValue(lojas) };
    const servico = new ServicoLojista(
        repositorioLojista as unknown as RepositorioLojista,
        {} as RepositorioUsuario,
        {} as RepositorioAssociacao,
        {} as RepositorioEndereco,
    );
    return { servico, repositorioLojista };
}

describe("ServicoLojista.listarDestaquesCatalogo", () => {
    it("ordena por ofertas vigentes, depois maior desconto, depois id, e limita", async () => {
        const agora = new Date("2026-10-28T12:00:00.000Z");
        const { servico, repositorioLojista } = criarServico([
            { id: 1, nomeFantasia: "Sem ofertas", urlLogo: null, ofertas: [] },
            {
                id: 2,
                nomeFantasia: "Duas ofertas",
                urlLogo: "/uploads/2.png",
                ofertas: [
                    { valorOriginal: 100, preco: 80 },
                    { valorOriginal: 50, preco: 25 },
                ],
            },
            { id: 3, nomeFantasia: "Uma com 10%", urlLogo: null, ofertas: [{ valorOriginal: 10, preco: 9 }] },
            { id: 4, nomeFantasia: "Uma com 40%", urlLogo: null, ofertas: [{ valorOriginal: 10, preco: 6 }] },
        ]);

        const destaques = await servico.listarDestaquesCatalogo(agora, 3);

        expect(repositorioLojista.listarAprovadasComOfertasVigentes).toHaveBeenCalledWith(agora);
        expect(destaques).toEqual([
            { id: 2, nomeFantasia: "Duas ofertas", urlLogo: "/uploads/2.png", ofertasVigentes: 2, maiorDesconto: 50 },
            { id: 4, nomeFantasia: "Uma com 40%", urlLogo: null, ofertasVigentes: 1, maiorDesconto: 40 },
            { id: 3, nomeFantasia: "Uma com 10%", urlLogo: null, ofertasVigentes: 1, maiorDesconto: 10 },
        ]);
    });

    it("loja sem desconto calculável fica com maiorDesconto null", async () => {
        const { servico } = criarServico([
            { id: 5, nomeFantasia: "Preço igual", urlLogo: null, ofertas: [{ valorOriginal: 10, preco: 10 }] },
        ]);

        const [destaque] = await servico.listarDestaquesCatalogo();

        expect(destaque).toMatchObject({ ofertasVigentes: 1, maiorDesconto: null });
    });
});
