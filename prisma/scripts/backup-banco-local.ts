import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Gera um dump (formato custom do pg_dump) do banco de DESENVOLVIMENTO local.
 * Recusa qualquer host que não seja localhost/127.0.0.1.
 *
 * Uso: npx tsx prisma/scripts/backup-banco-local.ts
 * Restaurar: pg_restore --clean --if-exists -d "$DATABASE_URL" <arquivo>
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
}

const url = new URL(connectionString);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(`Backup recusado: host "${url.hostname}" não é local`);
}
url.searchParams.delete("schema");

const pasta = path.resolve(__dirname, "..", "backups");
mkdirSync(pasta, { recursive: true });
const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
const arquivo = path.join(pasta, `${url.pathname.slice(1)}-${carimbo}.dump`);

const resultado = spawnSync("pg_dump", ["--format=custom", "--file", arquivo, url.toString()], {
    stdio: ["ignore", "inherit", "inherit"],
});

if (resultado.status !== 0) {
    throw new Error(`pg_dump falhou (status ${resultado.status})`);
}

console.log(`Backup gerado: ${arquivo}`);
