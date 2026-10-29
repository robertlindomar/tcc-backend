import { afterEach, describe, expect, it } from "vitest";
import {
    aplicarMigrations,
    BancoTemporario,
    criarBancoTemporario,
    lerMigration,
    testesDeBancoHabilitados,
} from "./bancoTemporario";

const MIGRATION = "20261028233000_campanha_edicoes_sorteio";

/** Monta o cenário no schema anterior à migration de edições. */
async function prepararBase(banco: BancoTemporario) {
    await aplicarMigrations(banco, MIGRATION);
    const [usuarioAssoc] = await banco.executar(
        `INSERT INTO usuario (nome_usuario, email_usuario, senha_usuario, role_usuario, data_atualizacao)
         VALUES ('Assoc', 'assoc@teste.dev', 'x', 'ASSOCIACAO', now()) RETURNING id_usuario`,
    );
    const [associacao] = await banco.executar(
        `INSERT INTO associacao (nome_fantasia_associacao, razao_social_associacao, cnpj_associacao, id_usuario, data_atualizacao)
         VALUES ('Assoc', 'Assoc LTDA', '11.111.111/0001-11', $1, now()) RETURNING id_associacao`,
        [usuarioAssoc!.id_usuario],
    );
    const [usuarioLoja] = await banco.executar(
        `INSERT INTO usuario (nome_usuario, email_usuario, senha_usuario, role_usuario, data_atualizacao)
         VALUES ('Loja', 'loja@teste.dev', 'x', 'LOJISTA', now()) RETURNING id_usuario`,
    );
    const [lojista] = await banco.executar(
        `INSERT INTO lojista (nome_fantasia_lojista, razao_social_lojista, cnpj_lojista, id_usuario, id_associacao, data_atualizacao)
         VALUES ('Loja', 'Loja LTDA', '22.222.222/0001-22', $1, $2, now()) RETURNING id_lojista`,
        [usuarioLoja!.id_usuario, associacao!.id_associacao],
    );
    const [usuarioCons] = await banco.executar(
        `INSERT INTO usuario (nome_usuario, email_usuario, senha_usuario, role_usuario, data_atualizacao)
         VALUES ('Cons', 'cons@teste.dev', 'x', 'CONSUMIDOR', now()) RETURNING id_usuario`,
    );
    const [consumidor] = await banco.executar(
        `INSERT INTO consumidor (cpf_consumidor, id_usuario, data_atualizacao)
         VALUES ('123.456.789-09', $1, now()) RETURNING id_consumidor`,
        [usuarioCons!.id_usuario],
    );
    return {
        associacaoId: associacao!.id_associacao as number,
        lojistaId: lojista!.id_lojista as number,
        consumidorId: consumidor!.id_consumidor as number,
    };
}

async function criarCampanha(banco: BancoTemporario, associacaoId: number, nome: string) {
    const [linha] = await banco.executar(
        `INSERT INTO campanha (nome_campanha, data_inicio_campanha, data_fim_campanha, valor_por_ticket_campanha, id_associacao, data_atualizacao)
         VALUES ($1, '2026-01-01T03:00:00Z', '2026-02-01T02:59:59Z', 10, $2, now()) RETURNING id_campanha`,
        [nome, associacaoId],
    );
    return linha!.id_campanha as number;
}

async function criarSorteio(banco: BancoTemporario, campanhaId: number, criadoEm: string) {
    const [linha] = await banco.executar(
        `INSERT INTO sorteio (id_campanha, data_criacao, data_atualizacao) VALUES ($1, $2, now()) RETURNING id_sorteio`,
        [campanhaId, criadoEm],
    );
    return linha!.id_sorteio as number;
}

async function criarTicketComResultado(
    banco: BancoTemporario,
    base: Awaited<ReturnType<typeof prepararBase>>,
    campanhaId: number,
    sorteioId: number,
    chave: string,
    numero: number,
) {
    const [proc] = await banco.executar(
        `INSERT INTO processamento_nfce (chave_acesso_nfce, id_campanha, id_consumidor, id_lojista, valor_nota_nfce,
            tickets_gerados_nfce, residual_antes_nfce, residual_apos_nfce, data_emissao_nfce, data_atualizacao)
         VALUES ($1, $2, $3, $4, 10, 1, 0, 0, '2026-01-10T12:00:00Z', now()) RETURNING id_processamento_nfce`,
        [chave, campanhaId, base.consumidorId, base.lojistaId],
    );
    const [ticket] = await banco.executar(
        `INSERT INTO ticket (numero_ticket, id_campanha, id_consumidor, id_processamento_nfce)
         VALUES ($1, $2, $3, $4) RETURNING id_ticket`,
        [numero, campanhaId, base.consumidorId, proc!.id_processamento_nfce],
    );
    await banco.executar(
        `INSERT INTO resultado_sorteio (id_sorteio, id_ticket, numero_sorteado_resultado, total_tickets_resultado, data_atualizacao)
         VALUES ($1, $2, $3, $3, now())`,
        [sorteioId, ticket!.id_ticket, numero],
    );
}

describe.skipIf(!testesDeBancoHabilitados)("migration campanha_edicoes_sorteio", () => {
    let banco: BancoTemporario | null = null;

    afterEach(async () => {
        await banco?.remover();
        banco = null;
    });

    it("migra dados existentes para a edição 1 com snapshots e sorteio automático", async () => {
        banco = await criarBancoTemporario("tcc_mig_ok");
        const base = await prepararBase(banco);
        const comSorteio = await criarCampanha(banco, base.associacaoId, "  Natal   Premiado ");
        const semSorteio = await criarCampanha(banco, base.associacaoId, "Páscoa");
        const sorteioId = await criarSorteio(banco, comSorteio, "2026-01-02T00:00:00Z");
        await criarTicketComResultado(banco, base, comSorteio, sorteioId, "1".repeat(44), 1);

        await banco.executar(lerMigration(MIGRATION));

        const campanhas = await banco.executar(
            `SELECT id_campanha, nome_campanha, nome_normalizado_campanha, ativa_campanha, edicao_campanha
             FROM campanha ORDER BY id_campanha`,
        );
        expect(campanhas).toEqual([
            expect.objectContaining({ nome_normalizado_campanha: "natal premiado", ativa_campanha: true, edicao_campanha: 1 }),
            expect.objectContaining({ nome_normalizado_campanha: "pascoa", edicao_campanha: 1 }),
        ]);

        const sorteios = await banco.executar(
            `SELECT id_sorteio, id_campanha, edicao_campanha, data_fim_edicao, valor_por_ticket_edicao
             FROM sorteio ORDER BY id_campanha`,
        );
        expect(sorteios).toHaveLength(2);
        expect(sorteios[0]).toMatchObject({ id_sorteio: sorteioId, edicao_campanha: 1, valor_por_ticket_edicao: "10.00" });
        expect(sorteios[1]).toMatchObject({ id_campanha: semSorteio, edicao_campanha: 1 });
        expect(sorteios[1]!.data_fim_edicao).toBeInstanceOf(Date);

        const [ticket] = await banco.executar(`SELECT edicao_campanha FROM ticket`);
        expect(ticket).toEqual({ edicao_campanha: 1 });
        const [resultados] = await banco.executar(`SELECT count(*)::int AS total FROM resultado_sorteio`);
        expect(resultados).toEqual({ total: 1 });
    });

    it("renomeia nomes duplicados (acento/caixa/espaço) com sufixo", async () => {
        banco = await criarBancoTemporario("tcc_mig_dup");
        const base = await prepararBase(banco);
        await criarCampanha(banco, base.associacaoId, "Ótica Verão");
        await criarCampanha(banco, base.associacaoId, "otica  verao");

        await banco.executar(lerMigration(MIGRATION));

        const linhas = await banco.executar(
            `SELECT nome_campanha, nome_normalizado_campanha FROM campanha ORDER BY id_campanha`,
        );
        expect(linhas).toEqual([
            { nome_campanha: "Ótica Verão", nome_normalizado_campanha: "otica verao" },
            { nome_campanha: "otica  verao (2)", nome_normalizado_campanha: "otica verao (2)" },
        ]);
    });

    it("mantém o sorteio com resultado e remove o excedente vazio", async () => {
        banco = await criarBancoTemporario("tcc_mig_multi");
        const base = await prepararBase(banco);
        const campanhaId = await criarCampanha(banco, base.associacaoId, "Campanha");
        const vazioAntigo = await criarSorteio(banco, campanhaId, "2026-01-01T00:00:00Z");
        const comResultado = await criarSorteio(banco, campanhaId, "2026-01-05T00:00:00Z");
        await criarTicketComResultado(banco, base, campanhaId, comResultado, "2".repeat(44), 1);

        await banco.executar(lerMigration(MIGRATION));

        const sorteios = await banco.executar(`SELECT id_sorteio FROM sorteio`);
        expect(sorteios).toEqual([{ id_sorteio: comResultado }]);
        expect(vazioAntigo).not.toBe(comResultado);
    });

    it("sem resultado, mantém o sorteio mais antigo", async () => {
        banco = await criarBancoTemporario("tcc_mig_antigo");
        const base = await prepararBase(banco);
        const campanhaId = await criarCampanha(banco, base.associacaoId, "Campanha");
        const antigo = await criarSorteio(banco, campanhaId, "2026-01-01T00:00:00Z");
        await criarSorteio(banco, campanhaId, "2026-01-05T00:00:00Z");

        await banco.executar(lerMigration(MIGRATION));

        expect(await banco.executar(`SELECT id_sorteio FROM sorteio`)).toEqual([{ id_sorteio: antigo }]);
    });

    it("aborta sem alterar nada quando há dois sorteios com resultado", async () => {
        banco = await criarBancoTemporario("tcc_mig_conflito");
        const base = await prepararBase(banco);
        const campanhaId = await criarCampanha(banco, base.associacaoId, "Campanha");
        const primeiro = await criarSorteio(banco, campanhaId, "2026-01-01T00:00:00Z");
        const segundo = await criarSorteio(banco, campanhaId, "2026-01-05T00:00:00Z");
        await criarTicketComResultado(banco, base, campanhaId, primeiro, "3".repeat(44), 1);
        await criarTicketComResultado(banco, base, campanhaId, segundo, "4".repeat(44), 2);

        await expect(banco.executar(lerMigration(MIGRATION))).rejects.toThrow(
            new RegExp(`campanha ${campanhaId}: sorteios ${primeiro},${segundo}`),
        );
        await banco.executar("ROLLBACK");

        const colunas = await banco.executar(
            `SELECT column_name FROM information_schema.columns
             WHERE table_name = 'campanha' AND column_name = 'edicao_campanha'`,
        );
        expect(colunas).toEqual([]);
        expect(await banco.executar(`SELECT count(*)::int AS total FROM sorteio`)).toEqual([{ total: 2 }]);
    });
});
