-- E3: frequência + validade de missões.
-- Backfill: missões existentes → UMA_VEZ (reproduz a regra antiga).
-- data_fim permanece NULL no legado (não invalida histórico; lojista não cria null pela API).
-- Conclusões existentes → chave_periodo = UNICA.
-- A UNIQUE antiga permanece até a nova UNIQUE existir (sem janela sem constraint).

-- CreateEnum
CREATE TYPE "FrequenciaMissao" AS ENUM ('UMA_VEZ', 'DIARIA', 'SEMANAL', 'MENSAL');

-- AlterTable missao
ALTER TABLE "missao" ADD COLUMN "frequencia_missao" "FrequenciaMissao" NOT NULL DEFAULT 'UMA_VEZ';
ALTER TABLE "missao" ADD COLUMN "data_fim" TIMESTAMP(3);

-- AlterTable missao_consumidor (DEFAULT só para backfill; removido em seguida)
ALTER TABLE "missao_consumidor" ADD COLUMN "chave_periodo" VARCHAR(16) NOT NULL DEFAULT 'UNICA';

-- Nova UNIQUE com a antiga ainda ativa
CREATE UNIQUE INDEX "missao_consumidor_id_missao_id_consumidor_chave_periodo_key"
  ON "missao_consumidor"("id_missao", "id_consumidor", "chave_periodo");

-- Remove a UNIQUE antiga (missão, consumidor) — a nova já cobre o legado UMA_VEZ/UNICA
DROP INDEX "missao_consumidor_id_missao_id_consumidor_key";

-- App sempre envia chave_periodo
ALTER TABLE "missao_consumidor" ALTER COLUMN "chave_periodo" DROP DEFAULT;
