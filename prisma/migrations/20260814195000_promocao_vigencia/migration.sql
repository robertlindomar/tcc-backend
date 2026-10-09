-- Vigência da promoção: datas persistidas + flag ativa (desativar ≠ excluir).
-- Legados: ativa=true; janela = [data_criacao, data_criacao + 30 dias] para não
-- expirar imediatamente o registro da demo.

ALTER TABLE "promocao" ADD COLUMN IF NOT EXISTS "ativa_promocao" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "promocao" ADD COLUMN IF NOT EXISTS "data_inicio" TIMESTAMP(3);
ALTER TABLE "promocao" ADD COLUMN IF NOT EXISTS "data_fim" TIMESTAMP(3);

UPDATE "promocao"
SET
    "data_inicio" = COALESCE("data_inicio", "data_criacao"),
    "data_fim" = COALESCE("data_fim", "data_criacao" + INTERVAL '30 days');

ALTER TABLE "promocao" ALTER COLUMN "data_inicio" SET NOT NULL;
ALTER TABLE "promocao" ALTER COLUMN "data_fim" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "promocao_data_fim_idx" ON "promocao"("data_fim");
