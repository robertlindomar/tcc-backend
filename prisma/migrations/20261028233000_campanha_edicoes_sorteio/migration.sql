-- Campanha reutilizável por edição (sem tabela nova).
-- Todos os dados existentes pertencem à edição 1. Os índices únicos só são
-- criados depois do saneamento. Qualquer falha aborta a transação inteira.

BEGIN;

-- 1) Colunas novas (com default para não quebrar linhas existentes).
ALTER TABLE "campanha"
  ADD COLUMN "ativa_campanha" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "edicao_campanha" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "nome_normalizado_campanha" VARCHAR(255);

ALTER TABLE "processamento_nfce" ADD COLUMN "edicao_campanha" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "residual_ticket_campanha" ADD COLUMN "edicao_campanha" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ticket" ADD COLUMN "edicao_campanha" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "sorteio"
  ADD COLUMN "edicao_campanha" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "data_inicio_edicao" TIMESTAMP(3),
  ADD COLUMN "data_fim_edicao" TIMESTAMP(3),
  ADD COLUMN "valor_por_ticket_edicao" DECIMAL(10,2);

-- 2) Nome normalizado: mesma regra de normalizarNomeCampanha (sem acento,
--    minúsculas, trim, espaços comprimidos).
UPDATE "campanha"
SET "nome_normalizado_campanha" = lower(btrim(regexp_replace(
  translate(
    "nome_campanha",
    'áàâãäåéèêëíìîïóòôõöúùûüçñýÿÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝ',
    'aaaaaaeeeeiiiiooooouuuucnyyAAAAAAEEEEIIIIOOOOOUUUUCNY'
  ),
  '\s+', ' ', 'g'
)));

-- 3) Nomes duplicados na mesma associação: mantém o mais antigo e acrescenta
--    " (n)" ao nome exibido e ao normalizado dos demais.
WITH duplicados AS (
  SELECT "id_campanha",
         ROW_NUMBER() OVER (
           PARTITION BY "id_associacao", "nome_normalizado_campanha"
           ORDER BY "id_campanha"
         ) AS ordem
  FROM "campanha"
)
UPDATE "campanha" c
SET "nome_campanha" = left(c."nome_campanha", 240) || ' (' || d.ordem || ')',
    "nome_normalizado_campanha" = left(c."nome_normalizado_campanha", 240) || ' (' || d.ordem || ')'
FROM duplicados d
WHERE d."id_campanha" = c."id_campanha" AND d.ordem > 1;

ALTER TABLE "campanha" ALTER COLUMN "nome_normalizado_campanha" SET NOT NULL;

-- 4) Vários sorteios por campanha: conflito real (2+ com resultado) aborta.
DO $$
DECLARE
  conflitos TEXT;
BEGIN
  SELECT string_agg(format('campanha %s: sorteios %s', id_campanha, ids), '; ')
  INTO conflitos
  FROM (
    SELECT s."id_campanha", string_agg(s."id_sorteio"::text, ',' ORDER BY s."id_sorteio") AS ids
    FROM "sorteio" s
    WHERE EXISTS (SELECT 1 FROM "resultado_sorteio" r WHERE r."id_sorteio" = s."id_sorteio")
    GROUP BY s."id_campanha"
    HAVING count(*) > 1
  ) x;

  IF conflitos IS NOT NULL THEN
    RAISE EXCEPTION 'Migration abortada: mais de um sorteio com resultado na mesma campanha (%)', conflitos;
  END IF;
END $$;

--    Mantém o sorteio com resultado; sem resultado, o mais antigo. Só remove
--    sorteios excedentes que não têm resultado.
WITH escolhido AS (
  SELECT DISTINCT ON (s."id_campanha") s."id_campanha", s."id_sorteio"
  FROM "sorteio" s
  ORDER BY s."id_campanha",
           EXISTS (SELECT 1 FROM "resultado_sorteio" r WHERE r."id_sorteio" = s."id_sorteio") DESC,
           s."data_criacao",
           s."id_sorteio"
)
DELETE FROM "sorteio" s
USING escolhido e
WHERE s."id_campanha" = e."id_campanha"
  AND s."id_sorteio" <> e."id_sorteio"
  AND NOT EXISTS (SELECT 1 FROM "resultado_sorteio" r WHERE r."id_sorteio" = s."id_sorteio");

-- 5) Campanha sem sorteio ganha o sorteio da edição 1.
INSERT INTO "sorteio" ("id_campanha", "edicao_campanha", "data_criacao", "data_atualizacao")
SELECT c."id_campanha", 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "campanha" c
WHERE NOT EXISTS (SELECT 1 FROM "sorteio" s WHERE s."id_campanha" = c."id_campanha");

-- 6) Snapshot do período/valor da edição 1 a partir da campanha.
UPDATE "sorteio" s
SET "data_inicio_edicao" = c."data_inicio_campanha",
    "data_fim_edicao" = c."data_fim_campanha",
    "valor_por_ticket_edicao" = c."valor_por_ticket_campanha"
FROM "campanha" c
WHERE c."id_campanha" = s."id_campanha";

ALTER TABLE "sorteio"
  ALTER COLUMN "data_inicio_edicao" SET NOT NULL,
  ALTER COLUMN "data_fim_edicao" SET NOT NULL,
  ALTER COLUMN "valor_por_ticket_edicao" SET NOT NULL;

-- 7) Unicidades por edição (após saneamento).
DROP INDEX "residual_ticket_campanha_id_consumidor_id_campanha_key";
DROP INDEX "ticket_id_campanha_numero_ticket_key";

CREATE UNIQUE INDEX "campanha_id_associacao_nome_normalizado_campanha_key"
  ON "campanha"("id_associacao", "nome_normalizado_campanha");
CREATE UNIQUE INDEX "residual_ticket_campanha_id_consumidor_id_campanha_edicao_c_key"
  ON "residual_ticket_campanha"("id_consumidor", "id_campanha", "edicao_campanha");
CREATE UNIQUE INDEX "sorteio_id_campanha_edicao_campanha_key"
  ON "sorteio"("id_campanha", "edicao_campanha");
CREATE UNIQUE INDEX "ticket_id_campanha_edicao_campanha_numero_ticket_key"
  ON "ticket"("id_campanha", "edicao_campanha", "numero_ticket");

-- 8) Invariantes extras: edição >= 1 e ticket na mesma edição da nota que o gerou.
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_edicao_positiva" CHECK ("edicao_campanha" >= 1);
ALTER TABLE "sorteio" ADD CONSTRAINT "sorteio_edicao_positiva" CHECK ("edicao_campanha" >= 1);
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_edicao_positiva" CHECK ("edicao_campanha" >= 1);
ALTER TABLE "residual_ticket_campanha"
  ADD CONSTRAINT "residual_ticket_campanha_edicao_positiva" CHECK ("edicao_campanha" >= 1);
ALTER TABLE "processamento_nfce"
  ADD CONSTRAINT "processamento_nfce_edicao_positiva" CHECK ("edicao_campanha" >= 1);

CREATE UNIQUE INDEX "processamento_nfce_id_edicao_key"
  ON "processamento_nfce"("id_processamento_nfce", "edicao_campanha");
ALTER TABLE "ticket"
  ADD CONSTRAINT "ticket_processamento_mesma_edicao_fkey"
  FOREIGN KEY ("id_processamento_nfce", "edicao_campanha")
  REFERENCES "processamento_nfce"("id_processamento_nfce", "edicao_campanha")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
