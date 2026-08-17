-- E5: estoque opcional, validade opcional, confirmação de entrega.
-- null estoque = ilimitado; 0 = esgotado. Resgates legados → ENTREGUE.

CREATE TYPE "StatusResgateRecompensa" AS ENUM ('PENDENTE_ENTREGA', 'ENTREGUE');

ALTER TABLE "recompensa"
  ADD COLUMN "estoque_recompensa" INTEGER,
  ADD COLUMN "data_fim_recompensa" TIMESTAMP(3);

ALTER TABLE "recompensa"
  ADD CONSTRAINT "recompensa_estoque_nao_negativo"
  CHECK ("estoque_recompensa" IS NULL OR "estoque_recompensa" >= 0);

ALTER TABLE "resgate_recompensa"
  ADD COLUMN "status_resgate_recompensa" "StatusResgateRecompensa" NOT NULL DEFAULT 'PENDENTE_ENTREGA',
  ADD COLUMN "data_entrega" TIMESTAMP(3);

UPDATE "resgate_recompensa"
SET
  "status_resgate_recompensa" = 'ENTREGUE',
  "data_entrega" = "data_criacao";
