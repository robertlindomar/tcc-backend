import { spawnSync } from "node:child_process";
import { criarBancoTemporario, lerMigration } from "../../src/integracao/bancoTemporario";

/**
 * Ensaia uma migration numa cópia descartável do banco local, restaurada de um
 * dump gerado por backup-banco-local.ts. O banco original não é tocado.
 *
 * Uso: npx tsx prisma/scripts/ensaiar-migration-em-copia.ts <arquivo.dump> <pasta_migration>
 */
async function main() {
    const [dump, migration] = process.argv.slice(2);
    if (!dump || !migration) {
        throw new Error("Uso: ensaiar-migration-em-copia.ts <arquivo.dump> <pasta_migration>");
    }

    const banco = await criarBancoTemporario("tcc_ensaio");
    try {
        const restauracao = spawnSync("pg_restore", ["--no-owner", "-d", banco.url, dump], {
            stdio: ["ignore", "inherit", "inherit"],
        });
        if (restauracao.status !== 0) {
            throw new Error(`pg_restore falhou (status ${restauracao.status})`);
        }

        await banco.executar(lerMigration(migration));

        const resumo = {
            campanhas: await banco.executar(
                `SELECT id_campanha, nome_campanha, nome_normalizado_campanha, ativa_campanha, edicao_campanha
                 FROM campanha ORDER BY id_campanha`,
            ),
            sorteios: await banco.executar(
                `SELECT s.id_sorteio, s.id_campanha, s.edicao_campanha, s.data_inicio_edicao, s.data_fim_edicao,
                        s.valor_por_ticket_edicao,
                        (SELECT count(*)::int FROM resultado_sorteio r WHERE r.id_sorteio = s.id_sorteio) AS resultados
                 FROM sorteio s ORDER BY s.id_campanha`,
            ),
            tickets: await banco.executar(
                `SELECT id_campanha, edicao_campanha, count(*)::int AS total, max(numero_ticket) AS maior
                 FROM ticket GROUP BY 1, 2 ORDER BY 1`,
            ),
            resultados: await banco.executar(`SELECT count(*)::int AS total FROM resultado_sorteio`),
        };
        console.log(JSON.stringify(resumo, null, 2));
    } finally {
        await banco.remover();
    }
}

main().catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
});
