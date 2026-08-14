-- Recompensa por lojista + histórico de resgate. CHECK impede saldo negativo.

ALTER TABLE "consumidor" DROP CONSTRAINT IF EXISTS "consumidor_pontos_nao_negativos";
ALTER TABLE "consumidor" ADD CONSTRAINT "consumidor_pontos_nao_negativos" CHECK ("pontos_consumidor" >= 0);

CREATE TABLE IF NOT EXISTS "recompensa" (
    "id_recompensa" SERIAL NOT NULL,
    "nome_recompensa" VARCHAR(255) NOT NULL,
    "descricao_recompensa" VARCHAR(500),
    "custo_pontos_recompensa" INTEGER NOT NULL,
    "ativa_recompensa" BOOLEAN NOT NULL DEFAULT true,
    "id_lojista" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recompensa_pkey" PRIMARY KEY ("id_recompensa")
);

CREATE INDEX IF NOT EXISTS "recompensa_id_lojista_idx" ON "recompensa"("id_lojista");

ALTER TABLE "recompensa" DROP CONSTRAINT IF EXISTS "recompensa_id_lojista_fkey";
ALTER TABLE "recompensa" ADD CONSTRAINT "recompensa_id_lojista_fkey" FOREIGN KEY ("id_lojista") REFERENCES "lojista"("id_lojista") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "resgate_recompensa" (
    "id_resgate_recompensa" SERIAL NOT NULL,
    "id_recompensa" INTEGER NOT NULL,
    "id_consumidor" INTEGER NOT NULL,
    "custo_pontos_snapshot" INTEGER NOT NULL,
    "nome_recompensa_snapshot" VARCHAR(255) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resgate_recompensa_pkey" PRIMARY KEY ("id_resgate_recompensa")
);

CREATE INDEX IF NOT EXISTS "resgate_recompensa_id_recompensa_idx" ON "resgate_recompensa"("id_recompensa");
CREATE INDEX IF NOT EXISTS "resgate_recompensa_id_consumidor_idx" ON "resgate_recompensa"("id_consumidor");

ALTER TABLE "resgate_recompensa" DROP CONSTRAINT IF EXISTS "resgate_recompensa_id_recompensa_fkey";
ALTER TABLE "resgate_recompensa" ADD CONSTRAINT "resgate_recompensa_id_recompensa_fkey" FOREIGN KEY ("id_recompensa") REFERENCES "recompensa"("id_recompensa") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "resgate_recompensa" DROP CONSTRAINT IF EXISTS "resgate_recompensa_id_consumidor_fkey";
ALTER TABLE "resgate_recompensa" ADD CONSTRAINT "resgate_recompensa_id_consumidor_fkey" FOREIGN KEY ("id_consumidor") REFERENCES "consumidor"("id_consumidor") ON DELETE RESTRICT ON UPDATE CASCADE;
