import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarAdaptadorNfce, resolverProviderNfce } from "../factory/criarAdaptadorNfce";
import { calcularDvChaveAcessoNfce } from "../utils/validarChaveAcessoNfce";
import { RepositorioProcessamentoNfce } from "../repository/RepositorioProcessamentoNfce";
import { ServicoProcessarNfce } from "./ServicoProcessarNfce";

const cnpj = "22399004000631";
function chave(numero = 1, emitente = cnpj, modelo = "65") {
    const base = `352609${emitente}${modelo}001${String(numero).padStart(9, "0")}112345678`;
    return base + calcularDvChaveAcessoNfce(base);
}
function xml(acesso: string, valor = "57.90", emitente = cnpj) {
    return `<nfeProc><NFe><infNFe Id="NFe${acesso}"><ide><mod>65</mod><dhEmi>2026-09-15T12:00:00-03:00</dhEmi></ide><emit><CNPJ>${emitente}</CNPJ></emit><total><ICMSTot><vNF>${valor}</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;
}

describe("NFC-e TESTE: QR → lojista → XML → crédito", () => {
    let diretorio: string;
    beforeEach(() => {
        diretorio = mkdtempSync(join(tmpdir(), "nfce-teste-"));
        vi.stubEnv("NFCE_XML_DIR", diretorio);
        vi.stubEnv("NFCE_PROVIDER", "teste");
        vi.stubEnv("NFCE_TESTE_FONTE", "xml");
        vi.stubEnv("NODE_ENV", "test");
    });
    afterEach(() => {
        vi.unstubAllEnvs();
        rmSync(diretorio, { recursive: true, force: true });
    });

    function preparar(status = "APROVADO", cadastrado = true) {
        const loja = { id: 2, cnpj: "22.399.004/0006-31", status, associacaoId: 1 };
        const buscarPorCnpjNormalizado = vi.fn(async (busca: string) => cadastrado && busca === cnpj ? loja : null);
        let residual = 0;
        let tickets = 0;
        const usadas = new Set<string>();
        const criar = vi.fn(async ({ data }: { data: { chaveAcesso: string } }) => {
            if (usadas.has(data.chaveAcesso)) throw { code: "P2002" };
            usadas.add(data.chaveAcesso);
            return { id: usadas.size };
        });
        const atualizar = vi.fn(async ({ data }: { data: { valorResidual: number; ticketsTotais: { increment: number } } }) => {
            residual = data.valorResidual;
            tickets += data.ticketsTotais.increment;
            return { ticketsTotais: tickets };
        });
        // Só a fronteira Prisma é substituída: adaptador, arquivo, serviço e motor são reais.
        const tx = {
            residualTicketCampanha: {
                createMany: vi.fn(),
                findUnique: async () => ({ id: 1, valorResidual: residual, ticketsTotais: tickets }),
                update: atualizar,
            },
            $executeRaw: vi.fn(),
            processamentoNfce: { create: criar },
        };
        const repositorio = new RepositorioProcessamentoNfce({
            $transaction: async (executar: (cliente: typeof tx) => Promise<unknown>) => executar(tx),
        } as never);
        const servico = new ServicoProcessarNfce(criarAdaptadorNfce(), {
            buscar: async () => ({ id: 1, associacaoId: 1, valorPorTicket: 10,
                dataInicio: new Date("2026-08-01"), dataFim: new Date("2026-12-31") }),
        } as never, { buscarPorCnpjNormalizado } as never, repositorio);
        const processar = (acesso = chave(), consumidorId = 9, campanhaId = 1) => servico.processar({
            consumidorId, campanhaId,
            payloadQr: `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${acesso}|2|1|15|9999.99`,
        });
        return { processar, criar, atualizar, buscarPorCnpjNormalizado };
    }

    it("duas chaves sem fixture: 57,90 → 5 + 7,90; 12,10 → 2 + 0", async () => {
        writeFileSync(join(diretorio, `${chave()}.xml`), xml(chave()));
        writeFileSync(join(diretorio, `${chave(2)}-procNFe.xml`), xml(chave(2), "12.10"));
        const { processar, buscarPorCnpjNormalizado } = preparar();
        expect(await processar()).toMatchObject({ ticketsGerados: 5, residualApos: 7.9, valorNota: 57.9, provider: "teste", statusFiscal: "DESCONHECIDO" });
        expect(await processar(chave(2))).toMatchObject({ ticketsGerados: 2, residualAntes: 7.9, residualApos: 0, ticketsTotaisCampanha: 7 });
        expect(buscarPorCnpjNormalizado).toHaveBeenCalledWith(cnpj);
    });

    it.each(["PENDENTE", "REJEITADO"])("rejeita loja %s antes de tentar XML", async (status) => {
        const { processar, criar } = preparar(status);
        await expect(processar()).rejects.toMatchObject({ detalhes: { codigo: "NFCE_LOJISTA_NAO_APROVADO" } });
        expect(criar).not.toHaveBeenCalled();
    });
    it("CNPJ não cadastrado", async () => {
        const { processar, criar } = preparar("APROVADO", false);
        await expect(processar()).rejects.toMatchObject({ detalhes: { codigo: "NFCE_LOJISTA_NAO_PARTICIPANTE" } });
        expect(criar).not.toHaveBeenCalled();
    });
    it("XML inexistente não credita", async () => {
        const { processar, criar } = preparar();
        await expect(processar()).rejects.toMatchObject({ statusCode: 422, detalhes: { codigo: "NFCE_DADOS_COMPLEMENTARES_INDISPONIVEIS" } });
        expect(criar).not.toHaveBeenCalled();
    });
    it("CNPJ do XML divergente", async () => {
        writeFileSync(join(diretorio, `${chave()}.xml`), xml(chave(), "57.90", "38281946000146"));
        const { processar, criar } = preparar();
        await expect(processar()).rejects.toMatchObject({ detalhes: { codigo: "NFCE_XML_CNPJ_DIVERGENTE" } });
        expect(criar).not.toHaveBeenCalled();
    });
    it.each(["chave", "modelo", "identidade", "valor", "data"])("XML inválido: %s", async (campo) => {
        let conteudo = xml(chave());
        if (campo === "chave") conteudo = xml(chave(2));
        if (campo === "modelo") conteudo = conteudo.replace("<mod>65", "<mod>55");
        if (campo === "identidade") conteudo = conteudo.replace(`Id="NFe${chave()}"`, "");
        if (campo === "valor") conteudo = conteudo.replace("57.90", "NaN");
        if (campo === "data") conteudo = conteudo.replace("2026-09-15T12:00:00-03:00", "invalida");
        writeFileSync(join(diretorio, `${chave()}.xml`), conteudo);
        const { processar, criar } = preparar();
        await expect(processar()).rejects.toMatchObject({ statusCode: 422 });
        expect(criar).not.toHaveBeenCalled();
    });
    it("replay global é 409 sem alterar residual", async () => {
        writeFileSync(join(diretorio, `${chave()}.xml`), xml(chave()));
        const { processar, atualizar } = preparar();
        await processar();
        for (const consumidor of [9, 10]) {
            await expect(processar(chave(), consumidor, 2)).rejects.toMatchObject({ statusCode: 409, detalhes: { codigo: "NFCE_JA_UTILIZADA" } });
        }
        expect(atualizar).toHaveBeenCalledTimes(1);
    });
    it.each(["123", chave().slice(0, 43) + (chave().endsWith("0") ? "1" : "0"), chave(1, cnpj, "55")])("rejeita chave inválida %s antes da loja", async (acesso) => {
        const { processar, buscarPorCnpjNormalizado } = preparar();
        await expect(processar(acesso)).rejects.toMatchObject({ statusCode: 400 });
        expect(buscarPorCnpjNormalizado).not.toHaveBeenCalled();
    });
    it("seleção explícita e bloqueio em produção", () => {
        expect(resolverProviderNfce()).toBe("teste");
        expect(resolverProviderNfce("simulado")).toBe("simulado");
        expect(resolverProviderNfce("sefaz")).toBe("sefaz");
        vi.stubEnv("NODE_ENV", "production");
        expect(() => criarAdaptadorNfce()).toThrow("NFCE_PROVIDER_TESTE_PROIBIDO_EM_PRODUCAO");
    });

    it("outro CNPJ também é lido sem allowlist de empresa", async () => {
        const outroCnpj = "11222333000181";
        const acesso = chave(42, outroCnpj);
        writeFileSync(join(diretorio, `${acesso}.xml`), xml(acesso, "23.45", outroCnpj));
        await expect(criarAdaptadorNfce().consultar(acesso)).resolves.toMatchObject({
            cnpjEmitente: outroCnpj, valorTotal: 23.45, provider: "teste",
        });
    });
});
