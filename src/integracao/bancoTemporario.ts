import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const PASTA_MIGRATIONS = path.resolve(__dirname, "..", "..", "prisma", "migrations");
const HOSTS_LOCAIS = ["localhost", "127.0.0.1", "::1"];

/** Suítes de banco só rodam com RODAR_TESTES_BANCO=1 e DATABASE_URL local. */
export const testesDeBancoHabilitados = process.env.RODAR_TESTES_BANCO === "1";

function urlBase(): URL {
    const conexao = process.env.DATABASE_URL;
    if (!conexao) {
        throw new Error("DATABASE_URL não está definida");
    }
    const url = new URL(conexao);
    if (!HOSTS_LOCAIS.includes(url.hostname)) {
        throw new Error(`Testes de banco recusados: host "${url.hostname}" não é local`);
    }
    url.searchParams.delete("schema");
    return url;
}

function urlDoBanco(nome: string): string {
    const url = urlBase();
    url.pathname = `/${nome}`;
    return url.toString();
}

export function listarMigrations(): string[] {
    return readdirSync(PASTA_MIGRATIONS, { withFileTypes: true })
        .filter((entrada) => entrada.isDirectory())
        .map((entrada) => entrada.name)
        .sort();
}

export function lerMigration(nome: string): string {
    return readFileSync(path.join(PASTA_MIGRATIONS, nome, "migration.sql"), "utf8");
}

export type BancoTemporario = {
    nome: string;
    url: string;
    executar: (sql: string, parametros?: unknown[]) => Promise<Record<string, unknown>[]>;
    remover: () => Promise<void>;
};

/** Cria um banco vazio e descartável no PostgreSQL local. */
export async function criarBancoTemporario(prefixo: string): Promise<BancoTemporario> {
    const nome = `${prefixo}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`.toLowerCase();
    const admin = new Client({ connectionString: urlBase().toString() });
    await admin.connect();
    try {
        await admin.query(`CREATE DATABASE "${nome}"`);
    } finally {
        await admin.end();
    }

    const url = urlDoBanco(nome);
    const cliente = new Client({ connectionString: url });
    await cliente.connect();

    return {
        nome,
        url,
        executar: async (sql, parametros) => (await cliente.query(sql, parametros as never)).rows,
        remover: async () => {
            await cliente.end();
            const adminRemocao = new Client({ connectionString: urlBase().toString() });
            await adminRemocao.connect();
            try {
                await adminRemocao.query(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
            } finally {
                await adminRemocao.end();
            }
        },
    };
}

/** Aplica as migrations em ordem; `ate` (exclusivo) permite parar antes de uma delas. */
export async function aplicarMigrations(banco: BancoTemporario, ate?: string): Promise<void> {
    for (const migration of listarMigrations()) {
        if (ate && migration >= ate) {
            break;
        }
        await banco.executar(lerMigration(migration));
    }
}
