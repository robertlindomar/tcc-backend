import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client";
import { RepositorioAssociacao } from "../modules/associacao/repository/RepositorioAssociacao";
import { RepositorioCampanha } from "../modules/campanha/repository/RepositorioCampanha";
import { ServicoCampanha } from "../modules/campanha/service/ServicoCampanha";
import { RepositorioConsumidor } from "../modules/consumidor/repository/RepositorioConsumidor";
import { RepositorioLojista } from "../modules/lojista/repository/RepositorioLojista";
import { AdaptadorNfce, NfceConsultada } from "../modules/nfce/adaptador/AdaptadorNfce";
import { RepositorioProcessamentoNfce } from "../modules/nfce/repository/RepositorioProcessamentoNfce";
import { ServicoProcessarNfce } from "../modules/nfce/service/ServicoProcessarNfce";
import { RepositorioAvisoSorteio } from "../modules/sorteio/avisos/RepositorioAvisoSorteio";
import { ServicoAvisoSorteio } from "../modules/sorteio/avisos/ServicoAvisoSorteio";
import { RepositorioSorteio } from "../modules/sorteio/repository/RepositorioSorteio";
import { ServicoSorteio } from "../modules/sorteio/service/ServicoSorteio";
import {
    aplicarMigrations,
    BancoTemporario,
    criarBancoTemporario,
    testesDeBancoHabilitados,
} from "./bancoTemporario";

/**
 * Fluxo ponta a ponta no PostgreSQL local (banco descartável), com relógio
 * controlado pelos serviços — sem alterar a hora do sistema operacional.
 */
describe.skipIf(!testesDeBancoHabilitados)("campanha por edição — fluxo integrado", () => {
    let banco: BancoTemporario;
    let prisma: PrismaClient;
    let relogio = new Date("2031-01-05T12:00:00.000Z");
    const agora = () => relogio;
    const numerosSorteados: number[] = [];
    const notas = new Map<string, { valor: number; emissao: Date }>();

    let servicoCampanha: ServicoCampanha;
    let servicoNfce: ServicoProcessarNfce;
    let servicoSorteio: ServicoSorteio;
    let servicoAvisos: ServicoAvisoSorteio;
    const ids = {
        usuarioAssoc: 0,
        usuarioOutraAssoc: 0,
        consumidorA: 0,
        consumidorB: 0,
        usuarioConsumidorA: 0,
        usuarioConsumidorB: 0,
    };

    const adaptador: AdaptadorNfce = {
        consultar: async (payload: string): Promise<NfceConsultada> => {
            const nota = notas.get(payload);
            if (!nota) {
                throw new Error("NFCE_NAO_ENCONTRADA");
            }
            return {
                chaveAcesso: payload,
                cnpjEmitente: "38281946000146",
                valorTotal: nota.valor,
                dataEmissao: nota.emissao,
                status: "AUTORIZADA",
                uf: "SP",
                modelo: 65,
                ambiente: "DEMO",
                provider: "simulado",
            };
        },
    };

    let sequenciaChave = 0;
    function nota(valor: number, emissao = relogio): string {
        sequenciaChave += 1;
        const chave = String(sequenciaChave).padStart(44, "3");
        notas.set(chave, { valor, emissao });
        return chave;
    }

    const creditar = (consumidorId: number, payloadQr: string, campanhaId?: number) =>
        servicoNfce.processar({ consumidorId, payloadQr, campanhaId, agora: relogio });

    async function criarUsuario(email: string, role: "ASSOCIACAO" | "LOJISTA" | "CONSUMIDOR") {
        return prisma.usuario.create({ data: { nome: email, email, senha: "x", role } });
    }

    beforeAll(async () => {
        banco = await criarBancoTemporario("tcc_fluxo_edicoes");
        await aplicarMigrations(banco);
        prisma = new PrismaClient({ adapter: new PrismaPg(banco.url) });

        const usuarioAssoc = await criarUsuario("assoc@fluxo.dev", "ASSOCIACAO");
        const associacao = await prisma.associacao.create({
            data: { nomeFantasia: "Assoc", razaoSocial: "Assoc LTDA", cnpj: "11.111.111/0001-11", usuarioId: usuarioAssoc.id },
        });
        const usuarioOutra = await criarUsuario("outra@fluxo.dev", "ASSOCIACAO");
        await prisma.associacao.create({
            data: { nomeFantasia: "Outra", razaoSocial: "Outra LTDA", cnpj: "22.222.222/0001-22", usuarioId: usuarioOutra.id },
        });
        const usuarioLoja = await criarUsuario("loja@fluxo.dev", "LOJISTA");
        await prisma.lojista.create({
            data: {
                nomeFantasia: "Loja",
                razaoSocial: "Loja LTDA",
                cnpj: "38.281.946/0001-46",
                status: "APROVADO",
                usuarioId: usuarioLoja.id,
                associacaoId: associacao.id,
            },
        });
        const usuarioA = await criarUsuario("a@fluxo.dev", "CONSUMIDOR");
        const usuarioB = await criarUsuario("b@fluxo.dev", "CONSUMIDOR");
        const consumidorA = await prisma.consumidor.create({ data: { cpf: "111.444.777-35", usuarioId: usuarioA.id } });
        const consumidorB = await prisma.consumidor.create({ data: { cpf: "529.982.247-25", usuarioId: usuarioB.id } });
        Object.assign(ids, {
            usuarioAssoc: usuarioAssoc.id,
            usuarioOutraAssoc: usuarioOutra.id,
            consumidorA: consumidorA.id,
            consumidorB: consumidorB.id,
            usuarioConsumidorA: usuarioA.id,
            usuarioConsumidorB: usuarioB.id,
        });

        const repositorioCampanha = new RepositorioCampanha(prisma);
        const repositorioAssociacao = new RepositorioAssociacao(prisma);
        servicoCampanha = new ServicoCampanha(repositorioCampanha, repositorioAssociacao, agora);
        servicoNfce = new ServicoProcessarNfce(
            adaptador,
            repositorioCampanha,
            new RepositorioLojista(prisma),
            new RepositorioProcessamentoNfce(prisma),
        );
        servicoSorteio = new ServicoSorteio(
            new RepositorioSorteio(prisma),
            repositorioCampanha,
            repositorioAssociacao,
            () => numerosSorteados.shift() ?? 1,
            agora,
        );
        servicoAvisos = new ServicoAvisoSorteio(
            new RepositorioAvisoSorteio(prisma),
            new RepositorioConsumidor(prisma),
            agora,
        );
    }, 60000);

    afterAll(async () => {
        await prisma?.$disconnect();
        await banco?.remover();
    });

    it("executa o ciclo completo com isolamento por edição", async () => {
        // Criar campanha → edição 1 + sorteio automático.
        const criada = await servicoCampanha.criar(ids.usuarioAssoc, {
            nome: "Natal Premiado",
            dataInicio: "2031-01-05",
            dataFim: "2031-01-20",
            valorPorTicket: 10,
        });
        expect(criada).toMatchObject({ ativa: true, edicao: 1, totalTickets: 0, situacaoSorteio: "AGUARDANDO_ENCERRAMENTO" });
        expect(criada.sorteioId).toEqual(expect.any(Number));
        const id = String(criada.id);
        const sorteioEdicao1 = String(criada.sorteioId);

        // Nome único por associação (acento/caixa/espaço).
        await expect(
            servicoCampanha.criar(ids.usuarioAssoc, {
                nome: "  NATAL   premiado ",
                dataInicio: "2031-03-01",
                dataFim: "2031-03-10",
                valorPorTicket: 10,
            }),
        ).rejects.toMatchObject({ statusCode: 409, detalhes: { codigo: "CAMPANHA_NOME_DUPLICADO" } });
        const outraAssoc = await servicoCampanha.criar(ids.usuarioOutraAssoc, {
            nome: "Natal Premiado",
            dataInicio: "2031-03-01",
            dataFim: "2031-03-10",
            valorPorTicket: 10,
        });
        expect(outraAssoc.edicao).toBe(1);

        // Processar NFC-e → tickets 1..N da edição 1 (inclui créditos concorrentes).
        relogio = new Date("2031-01-06T12:00:00.000Z");
        const a1 = await creditar(ids.consumidorA, nota(35));
        expect(a1).toMatchObject({ edicao: 1, ticketsGerados: 3, residualApos: 5, numerosTickets: { primeiro: 1, ultimo: 3 } });
        const b1 = await creditar(ids.consumidorB, nota(20));
        expect(b1.numerosTickets).toEqual({ primeiro: 4, ultimo: 5 });
        const concorrentes = await Promise.all([
            creditar(ids.consumidorA, nota(10)),
            creditar(ids.consumidorB, nota(10)),
        ]);
        expect(concorrentes.map((c) => c.numerosTickets!.primeiro).sort()).toEqual([6, 7]);
        const semTicket = await creditar(ids.consumidorB, nota(3));
        expect(semTicket.numerosTickets).toBeNull();

        // Edição já usada (inclusive nota com 0 ticket) não muda valor/período.
        await expect(servicoCampanha.atualizar(ids.usuarioAssoc, id, { valorPorTicket: 20 })).rejects.toMatchObject({
            statusCode: 409,
            detalhes: { codigo: "CAMPANHA_EDICAO_EM_USO" },
        });

        // Sortear antes do fim → 409.
        relogio = new Date("2031-01-15T12:00:00.000Z");
        await expect(servicoSorteio.sortear(ids.usuarioAssoc, sorteioEdicao1)).rejects.toMatchObject({
            detalhes: { codigo: "CAMPANHA_NAO_ENCERRADA" },
        });

        // Depois do fim: sem créditos, inativa, reativar exige sorteio, sorteia.
        relogio = new Date("2031-01-21T12:00:00.000Z");
        await expect(creditar(ids.consumidorA, nota(50, new Date("2031-01-19T12:00:00.000Z")), criada.id)).rejects.toMatchObject({
            detalhes: { codigo: "CAMPANHA_NAO_VIGENTE" },
        });
        const inativa = await servicoCampanha.inativar(ids.usuarioAssoc, id);
        expect(inativa).toMatchObject({ ativa: false, totalTickets: 7, situacaoSorteio: "PRONTO_PARA_SORTEAR" });
        await expect(
            servicoCampanha.reativar(ids.usuarioAssoc, id, { dataInicio: "2031-01-25", dataFim: "2031-02-10" }),
        ).rejects.toMatchObject({ statusCode: 409, detalhes: { codigo: "SORTEIO_PENDENTE" } });

        numerosSorteados.push(2);
        const sorteado = await servicoSorteio.sortear(ids.usuarioAssoc, sorteioEdicao1);
        expect(sorteado).toMatchObject({ edicao: 1, totalTickets: 7, resultadoAtual: { numeroSorteado: 2 } });

        // Reativações concorrentes: só uma abre a edição 2.
        relogio = new Date("2031-01-22T12:00:00.000Z");
        const reativacoes = await Promise.allSettled([
            servicoCampanha.reativar(ids.usuarioAssoc, id, { dataInicio: "2031-01-25", dataFim: "2031-02-10", valorPorTicket: 20 }),
            servicoCampanha.reativar(ids.usuarioAssoc, id, { dataInicio: "2031-01-25", dataFim: "2031-02-10", valorPorTicket: 20 }),
        ]);
        const sucesso = reativacoes.filter((r) => r.status === "fulfilled");
        const falha = reativacoes.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        expect(sucesso).toHaveLength(1);
        expect(falha).toHaveLength(1);
        expect(falha[0]!.reason).toMatchObject({ statusCode: 409 });
        const edicao2 = (sucesso[0] as PromiseFulfilledResult<Awaited<ReturnType<ServicoCampanha["reativar"]>>>).value;
        expect(edicao2).toMatchObject({ ativa: true, edicao: 2, totalTickets: 0, valorPorTicket: 20 });
        expect(edicao2.sorteioId).not.toBe(criada.sorteioId);
        expect(await prisma.sorteio.count({ where: { campanhaId: criada.id } })).toBe(2);

        // Edição 2: tickets recomeçam do 1, residual independente, NFC-e global.
        relogio = new Date("2031-01-26T12:00:00.000Z");
        const chaveUsadaEd1 = [...notas.keys()][0]!;
        notas.set(chaveUsadaEd1, { valor: 35, emissao: relogio });
        await expect(creditar(ids.consumidorA, chaveUsadaEd1)).rejects.toMatchObject({
            statusCode: 409,
            detalhes: { codigo: "NFCE_JA_UTILIZADA" },
        });
        await expect(creditar(ids.consumidorA, nota(40, new Date("2031-01-10T12:00:00.000Z")))).rejects.toMatchObject({
            detalhes: { codigo: "NFCE_FORA_PERIODO" },
        });
        const a2 = await creditar(ids.consumidorA, nota(45));
        expect(a2).toMatchObject({
            edicao: 2,
            ticketsGerados: 2,
            residualAntes: 0,
            residualApos: 5,
            ticketsTotaisCampanha: 2,
            numerosTickets: { primeiro: 1, ultimo: 2 },
        });

        const porEdicao = await prisma.ticket.groupBy({
            by: ["edicao"],
            where: { campanhaId: criada.id },
            _count: { _all: true },
            orderBy: { edicao: "asc" },
        });
        expect(porEdicao.map((g) => [g.edicao, g._count._all])).toEqual([[1, 7], [2, 2]]);
        const residuaisA = await prisma.residualTicketCampanha.findMany({
            where: { campanhaId: criada.id, consumidorId: ids.consumidorA },
            orderBy: { edicao: "asc" },
        });
        expect(residuaisA.map((r) => [r.edicao, Number(r.valorResidual), r.ticketsTotais])).toEqual([
            [1, 5, 4],
            [2, 5, 2],
        ]);

        // Histórico pelos snapshots do sorteio.
        const edicoes = await servicoCampanha.listarEdicoes(ids.usuarioAssoc, id);
        expect(edicoes).toEqual([
            expect.objectContaining({ edicao: 2, atual: true, valorPorTicket: 20, totalTickets: 2, dataInicioCivil: "2031-01-25" }),
            expect.objectContaining({
                edicao: 1,
                atual: false,
                valorPorTicket: 10,
                totalTickets: 7,
                dataInicioCivil: "2031-01-05",
                dataFimCivil: "2031-01-20",
                situacaoSorteio: "AGUARDANDO_ENTREGA",
            }),
        ]);

        // Edição antiga segue operável: prazo vence, refazer sorteia só tickets da edição 1.
        relogio = new Date("2031-01-29T12:00:00.000Z");
        numerosSorteados.push(2, 5);
        const refeito = await servicoSorteio.refazer(ids.usuarioAssoc, sorteioEdicao1);
        expect(refeito.resultadoAtual).toMatchObject({ numeroSorteado: 5 });
        const vencedor = await prisma.resultadoSorteio.findFirstOrThrow({
            where: { sorteioId: Number(sorteioEdicao1), situacao: "AGUARDANDO_ENTREGA" },
            include: { ticket: true },
        });
        expect(vencedor.ticket).toMatchObject({ campanhaId: criada.id, edicao: 1, numero: 5, consumidorId: ids.consumidorB });

        // Avisos da edição antiga continuam acessíveis; leitura + entrega.
        const avisos = await servicoAvisos.listar(ids.usuarioConsumidorB);
        const aviso = avisos.find((item) => item.resultadoId === vencedor.id);
        expect(aviso).toMatchObject({ souVencedor: true, numeroSorteado: 5 });
        await servicoAvisos.confirmarLeitura(ids.usuarioConsumidorB, String(vencedor.id));
        const entregue = await servicoSorteio.confirmarEntrega(ids.usuarioAssoc, sorteioEdicao1);
        expect(entregue.resultadoAtual?.situacao).toBe("ENTREGUE");

        // Exclusão: com histórico 409; vazia remove o sorteio automático junto.
        await expect(servicoCampanha.deletar(ids.usuarioAssoc, id)).rejects.toMatchObject({
            statusCode: 409,
            detalhes: { codigo: "CAMPANHA_COM_TICKETS" },
        });
        await servicoCampanha.deletar(ids.usuarioOutraAssoc, String(outraAssoc.id));
        expect(await prisma.campanha.count({ where: { id: outraAssoc.id } })).toBe(0);
        expect(await prisma.sorteio.count({ where: { campanhaId: outraAssoc.id } })).toBe(0);

        // Exclusão confirmada apaga todo o histórico das duas edições.
        await servicoCampanha.deletar(ids.usuarioAssoc, id, true);
        const restantes = await Promise.all([
            prisma.campanha.count({ where: { id: criada.id } }),
            prisma.sorteio.count({ where: { campanhaId: criada.id } }),
            prisma.resultadoSorteio.count({ where: { sorteio: { campanhaId: criada.id } } }),
            prisma.ticket.count({ where: { campanhaId: criada.id } }),
            prisma.processamentoNfce.count({ where: { campanhaId: criada.id } }),
            prisma.residualTicketCampanha.count({ where: { campanhaId: criada.id } }),
        ]);
        expect(restantes).toEqual([0, 0, 0, 0, 0, 0]);
        expect(await prisma.consumidor.count({ where: { id: { in: [ids.consumidorA, ids.consumidorB] } } })).toBe(2);
    }, 60000);

    it("faz rollback da campanha quando a criação do sorteio falha", async () => {
        await banco.executar(`
            CREATE FUNCTION falhar_sorteio() RETURNS trigger AS $$
            BEGIN RAISE EXCEPTION 'falha simulada ao criar sorteio'; END $$ LANGUAGE plpgsql;
            CREATE TRIGGER falhar_sorteio BEFORE INSERT ON sorteio FOR EACH ROW EXECUTE FUNCTION falhar_sorteio();
        `);
        try {
            relogio = new Date("2031-05-01T12:00:00.000Z");
            const antes = await prisma.campanha.count();
            await expect(
                servicoCampanha.criar(ids.usuarioAssoc, {
                    nome: "Campanha Rollback",
                    dataInicio: "2031-05-01",
                    dataFim: "2031-05-10",
                    valorPorTicket: 10,
                }),
            ).rejects.toMatchObject({ statusCode: 500 });
            expect(await prisma.campanha.count()).toBe(antes);
        } finally {
            await banco.executar(`DROP TRIGGER falhar_sorteio ON sorteio; DROP FUNCTION falhar_sorteio();`);
        }
    });
});
