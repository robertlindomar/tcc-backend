-- F2.1: NFC-e processada (chave UNIQUE global) + residual/tickets por consumidor+campanha.

CREATE TABLE "processamento_nfce" (
    "id_processamento_nfce" SERIAL NOT NULL,
    "chave_acesso_nfce" VARCHAR(44) NOT NULL,
    "id_campanha" INTEGER NOT NULL,
    "id_consumidor" INTEGER NOT NULL,
    "id_lojista" INTEGER NOT NULL,
    "valor_nota_nfce" DECIMAL(10,2) NOT NULL,
    "tickets_gerados_nfce" INTEGER NOT NULL,
    "residual_antes_nfce" DECIMAL(10,2) NOT NULL,
    "residual_apos_nfce" DECIMAL(10,2) NOT NULL,
    "data_emissao_nfce" TIMESTAMP(3) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processamento_nfce_pkey" PRIMARY KEY ("id_processamento_nfce")
);

CREATE UNIQUE INDEX "processamento_nfce_chave_acesso_nfce_key" ON "processamento_nfce"("chave_acesso_nfce");
CREATE INDEX "processamento_nfce_id_campanha_idx" ON "processamento_nfce"("id_campanha");
CREATE INDEX "processamento_nfce_id_consumidor_idx" ON "processamento_nfce"("id_consumidor");
CREATE INDEX "processamento_nfce_id_lojista_idx" ON "processamento_nfce"("id_lojista");

ALTER TABLE "processamento_nfce"
  ADD CONSTRAINT "processamento_nfce_tickets_nao_negativo"
  CHECK ("tickets_gerados_nfce" >= 0);
ALTER TABLE "processamento_nfce"
  ADD CONSTRAINT "processamento_nfce_valor_nao_negativo"
  CHECK ("valor_nota_nfce" >= 0);
ALTER TABLE "processamento_nfce"
  ADD CONSTRAINT "processamento_nfce_residual_antes_nao_negativo"
  CHECK ("residual_antes_nfce" >= 0);
ALTER TABLE "processamento_nfce"
  ADD CONSTRAINT "processamento_nfce_residual_apos_nao_negativo"
  CHECK ("residual_apos_nfce" >= 0);

ALTER TABLE "processamento_nfce"
  ADD CONSTRAINT "processamento_nfce_id_campanha_fkey"
  FOREIGN KEY ("id_campanha") REFERENCES "campanha"("id_campanha") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "processamento_nfce"
  ADD CONSTRAINT "processamento_nfce_id_consumidor_fkey"
  FOREIGN KEY ("id_consumidor") REFERENCES "consumidor"("id_consumidor") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "processamento_nfce"
  ADD CONSTRAINT "processamento_nfce_id_lojista_fkey"
  FOREIGN KEY ("id_lojista") REFERENCES "lojista"("id_lojista") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "residual_ticket_campanha" (
    "id_residual_ticket_campanha" SERIAL NOT NULL,
    "id_consumidor" INTEGER NOT NULL,
    "id_campanha" INTEGER NOT NULL,
    "valor_residual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tickets_totais" INTEGER NOT NULL DEFAULT 0,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residual_ticket_campanha_pkey" PRIMARY KEY ("id_residual_ticket_campanha")
);

CREATE UNIQUE INDEX "residual_ticket_campanha_id_consumidor_id_campanha_key"
  ON "residual_ticket_campanha"("id_consumidor", "id_campanha");
CREATE INDEX "residual_ticket_campanha_id_campanha_idx"
  ON "residual_ticket_campanha"("id_campanha");

ALTER TABLE "residual_ticket_campanha"
  ADD CONSTRAINT "residual_ticket_campanha_valor_nao_negativo"
  CHECK ("valor_residual" >= 0);
ALTER TABLE "residual_ticket_campanha"
  ADD CONSTRAINT "residual_ticket_campanha_tickets_nao_negativo"
  CHECK ("tickets_totais" >= 0);

ALTER TABLE "residual_ticket_campanha"
  ADD CONSTRAINT "residual_ticket_campanha_id_consumidor_fkey"
  FOREIGN KEY ("id_consumidor") REFERENCES "consumidor"("id_consumidor") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "residual_ticket_campanha"
  ADD CONSTRAINT "residual_ticket_campanha_id_campanha_fkey"
  FOREIGN KEY ("id_campanha") REFERENCES "campanha"("id_campanha") ON DELETE RESTRICT ON UPDATE CASCADE;
