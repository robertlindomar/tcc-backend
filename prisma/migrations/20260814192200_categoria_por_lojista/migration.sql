-- Categorias passam a pertencer a um lojista.
-- Produtos que usavam o catálogo global são religados a um clone da categoria
-- com o mesmo nome na própria loja. Categorias globais sem produto (órfãs)
-- são removidas — descarte aceito 2026-08-14 (catálogo deixa de ser global).
-- SQL idempotente: a primeira tentativa desta migration falhou a meio no ambiente local.

ALTER TABLE "categoria" ADD COLUMN IF NOT EXISTS "id_lojista" INTEGER;

INSERT INTO "categoria" ("nome_categoria", "id_lojista", "data_criacao", "data_atualizacao")
SELECT DISTINCT c."nome_categoria", p."id_lojista", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "produto" p
INNER JOIN "categoria" c ON c."id_categoria" = p."categoria_fk"
WHERE p."categoria_fk" IS NOT NULL
  AND c."id_lojista" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "categoria" c2
    WHERE c2."id_lojista" = p."id_lojista"
      AND c2."nome_categoria" = c."nome_categoria"
  );

UPDATE "produto" AS p
SET "categoria_fk" = c_new."id_categoria"
FROM "categoria" AS c_old, "categoria" AS c_new
WHERE p."categoria_fk" = c_old."id_categoria"
  AND c_old."id_lojista" IS NULL
  AND c_new."nome_categoria" = c_old."nome_categoria"
  AND c_new."id_lojista" = p."id_lojista";

DELETE FROM "categoria" WHERE "id_lojista" IS NULL;

-- Remove clones duplicados de tentativas anteriores, preservando o id usado pelos produtos.
UPDATE "produto" AS p
SET "categoria_fk" = keep."id_manter"
FROM "categoria" AS c_atual, (
    SELECT
        MIN(c."id_categoria") AS "id_manter",
        c."id_lojista",
        c."nome_categoria"
    FROM "categoria" c
    GROUP BY c."id_lojista", c."nome_categoria"
) AS keep
WHERE p."categoria_fk" = c_atual."id_categoria"
  AND c_atual."id_lojista" = keep."id_lojista"
  AND c_atual."nome_categoria" = keep."nome_categoria"
  AND p."categoria_fk" <> keep."id_manter";

DELETE FROM "categoria" c
WHERE c."id_categoria" NOT IN (
    SELECT MIN(c2."id_categoria")
    FROM "categoria" c2
    GROUP BY c2."id_lojista", c2."nome_categoria"
);

ALTER TABLE "categoria" ALTER COLUMN "id_lojista" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "categoria_id_lojista_idx" ON "categoria"("id_lojista");

CREATE UNIQUE INDEX IF NOT EXISTS "categoria_id_lojista_nome_categoria_key" ON "categoria"("id_lojista", "nome_categoria");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'categoria_id_lojista_fkey'
    ) THEN
        ALTER TABLE "categoria"
            ADD CONSTRAINT "categoria_id_lojista_fkey"
            FOREIGN KEY ("id_lojista") REFERENCES "lojista"("id_lojista")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
