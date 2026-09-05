-- F1: vigência da campanha + valor por ticket (G12).
-- Legados: janela a partir de data_criacao; R$10,00 por ticket (demo).

ALTER TABLE "campanha" ADD COLUMN IF NOT EXISTS "data_inicio_campanha" TIMESTAMP(3);
ALTER TABLE "campanha" ADD COLUMN IF NOT EXISTS "data_fim_campanha" TIMESTAMP(3);
ALTER TABLE "campanha" ADD COLUMN IF NOT EXISTS "valor_por_ticket_campanha" DECIMAL(10,2);

UPDATE "campanha"
SET
  "data_inicio_campanha" = COALESCE("data_inicio_campanha", "data_criacao"),
  "data_fim_campanha" = COALESCE("data_fim_campanha", "data_criacao" + INTERVAL '365 days'),
  "valor_por_ticket_campanha" = COALESCE("valor_por_ticket_campanha", 10.00);

ALTER TABLE "campanha" ALTER COLUMN "data_inicio_campanha" SET NOT NULL;
ALTER TABLE "campanha" ALTER COLUMN "data_fim_campanha" SET NOT NULL;
ALTER TABLE "campanha" ALTER COLUMN "valor_por_ticket_campanha" SET NOT NULL;

ALTER TABLE "campanha"
  DROP CONSTRAINT IF EXISTS "campanha_valor_por_ticket_positivo";
ALTER TABLE "campanha"
  ADD CONSTRAINT "campanha_valor_por_ticket_positivo"
  CHECK ("valor_por_ticket_campanha" > 0);

ALTER TABLE "campanha"
  DROP CONSTRAINT IF EXISTS "campanha_periodo_valido";
ALTER TABLE "campanha"
  ADD CONSTRAINT "campanha_periodo_valido"
  CHECK ("data_fim_campanha" >= "data_inicio_campanha");

CREATE INDEX IF NOT EXISTS "campanha_data_fim_campanha_idx" ON "campanha"("data_fim_campanha");
