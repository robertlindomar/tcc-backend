import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { normalizarNomeCampanha } from "../../src/modules/campanha/utils/normalizarNomeCampanha";

/**
 * Relatório somente leitura dos dados de campanha/sorteio antes (ou depois) da
 * migration de edições. Não altera nada no banco.
 *
 * Uso: npx tsx prisma/scripts/auditar-campanhas-edicoes.ts
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

type LinhaCampanha = { id: number; associacaoId: number; nome: string };
type LinhaSorteio = { id: number; campanhaId: number; resultados: number; dataCriacao: Date };

async function contar(tabela: string): Promise<number> {
    const [linha] = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
        `SELECT count(*)::bigint AS total FROM "${tabela}"`,
    );
    return Number(linha?.total ?? 0);
}

async function main() {
    const totais: Record<string, number> = {};
    for (const tabela of [
        "campanha",
        "ticket",
        "residual_ticket_campanha",
        "processamento_nfce",
        "sorteio",
        "resultado_sorteio",
    ]) {
        totais[tabela] = await contar(tabela);
    }

    const campanhas = await prisma.$queryRawUnsafe<LinhaCampanha[]>(
        `SELECT id_campanha AS id, id_associacao AS "associacaoId", nome_campanha AS nome
         FROM campanha ORDER BY id_campanha`,
    );
    const sorteios = await prisma.$queryRawUnsafe<LinhaSorteio[]>(
        `SELECT s.id_sorteio AS id, s.id_campanha AS "campanhaId", s.data_criacao AS "dataCriacao",
                (SELECT count(*)::int FROM resultado_sorteio r WHERE r.id_sorteio = s.id_sorteio) AS resultados
         FROM sorteio s ORDER BY s.id_campanha, s.data_criacao, s.id_sorteio`,
    );

    const nomesPorChave = new Map<string, LinhaCampanha[]>();
    for (const campanha of campanhas) {
        const chave = `${campanha.associacaoId}:${normalizarNomeCampanha(campanha.nome)}`;
        nomesPorChave.set(chave, [...(nomesPorChave.get(chave) ?? []), campanha]);
    }
    const nomesDuplicados = [...nomesPorChave.values()].filter((grupo) => grupo.length > 1);

    const sorteiosPorCampanha = new Map<number, LinhaSorteio[]>();
    for (const sorteio of sorteios) {
        sorteiosPorCampanha.set(sorteio.campanhaId, [
            ...(sorteiosPorCampanha.get(sorteio.campanhaId) ?? []),
            sorteio,
        ]);
    }
    const semSorteio = campanhas.filter((c) => !sorteiosPorCampanha.has(c.id)).map((c) => c.id);
    const multiplos = [...sorteiosPorCampanha.entries()]
        .filter(([, lista]) => lista.length > 1)
        .map(([campanhaId, lista]) => ({
            campanhaId,
            sorteios: lista.map((s) => ({ id: s.id, resultados: s.resultados })),
            conflitoReal: lista.filter((s) => s.resultados > 0).length > 1,
        }));

    console.log(JSON.stringify({ totais, nomesDuplicados, semSorteio, multiplos }, null, 2));
}

main()
    .catch((erro) => {
        console.error(erro);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
