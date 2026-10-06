-- G17: ticket individual numerado por campanha + resultado do sorteio (revoga G15).

CREATE TABLE "ticket" (
    "id_ticket" SERIAL NOT NULL,
    "numero_ticket" INTEGER NOT NULL,
    "id_campanha" INTEGER NOT NULL,
    "id_consumidor" INTEGER NOT NULL,
    "id_processamento_nfce" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id_ticket")
);

CREATE UNIQUE INDEX "ticket_id_campanha_numero_ticket_key" ON "ticket"("id_campanha", "numero_ticket");
CREATE INDEX "ticket_id_consumidor_idx" ON "ticket"("id_consumidor");
CREATE INDEX "ticket_id_processamento_nfce_idx" ON "ticket"("id_processamento_nfce");

ALTER TABLE "ticket"
  ADD CONSTRAINT "ticket_numero_positivo"
  CHECK ("numero_ticket" >= 1);

ALTER TABLE "ticket"
  ADD CONSTRAINT "ticket_id_campanha_fkey"
  FOREIGN KEY ("id_campanha") REFERENCES "campanha"("id_campanha") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket"
  ADD CONSTRAINT "ticket_id_consumidor_fkey"
  FOREIGN KEY ("id_consumidor") REFERENCES "consumidor"("id_consumidor") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket"
  ADD CONSTRAINT "ticket_id_processamento_nfce_fkey"
  FOREIGN KEY ("id_processamento_nfce") REFERENCES "processamento_nfce"("id_processamento_nfce") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: tickets das NFC-e já processadas, numerados por campanha na ordem de processamento.
INSERT INTO "ticket" ("numero_ticket", "id_campanha", "id_consumidor", "id_processamento_nfce", "data_criacao")
SELECT
    ROW_NUMBER() OVER (PARTITION BY p."id_campanha" ORDER BY p."id_processamento_nfce", s.n),
    p."id_campanha",
    p."id_consumidor",
    p."id_processamento_nfce",
    p."data_criacao"
FROM "processamento_nfce" p
CROSS JOIN LATERAL generate_series(1, p."tickets_gerados_nfce") AS s(n)
WHERE p."tickets_gerados_nfce" > 0;

CREATE TYPE "SituacaoResultadoSorteio" AS ENUM ('AGUARDANDO_ENTREGA', 'ENTREGUE', 'CANCELADO');

CREATE TABLE "resultado_sorteio" (
    "id_resultado_sorteio" SERIAL NOT NULL,
    "id_sorteio" INTEGER NOT NULL,
    "id_ticket" INTEGER NOT NULL,
    "numero_sorteado_resultado" INTEGER NOT NULL,
    "total_tickets_resultado" INTEGER NOT NULL,
    "situacao_resultado" "SituacaoResultadoSorteio" NOT NULL DEFAULT 'AGUARDANDO_ENTREGA',
    "data_sorteio_resultado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resultado_sorteio_pkey" PRIMARY KEY ("id_resultado_sorteio")
);

CREATE INDEX "resultado_sorteio_id_sorteio_idx" ON "resultado_sorteio"("id_sorteio");
CREATE INDEX "resultado_sorteio_id_ticket_idx" ON "resultado_sorteio"("id_ticket");

-- No máximo 1 resultado ativo (não cancelado) por sorteio.
CREATE UNIQUE INDEX "resultado_sorteio_ativo_por_sorteio"
  ON "resultado_sorteio"("id_sorteio")
  WHERE "situacao_resultado" <> 'CANCELADO';

ALTER TABLE "resultado_sorteio"
  ADD CONSTRAINT "resultado_sorteio_numero_no_intervalo"
  CHECK ("numero_sorteado_resultado" >= 1 AND "numero_sorteado_resultado" <= "total_tickets_resultado");

ALTER TABLE "resultado_sorteio"
  ADD CONSTRAINT "resultado_sorteio_id_sorteio_fkey"
  FOREIGN KEY ("id_sorteio") REFERENCES "sorteio"("id_sorteio") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resultado_sorteio"
  ADD CONSTRAINT "resultado_sorteio_id_ticket_fkey"
  FOREIGN KEY ("id_ticket") REFERENCES "ticket"("id_ticket") ON DELETE RESTRICT ON UPDATE CASCADE;
