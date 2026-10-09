-- Token opaco do QR da missão. Backfill com bytes aleatórios (pgcrypto).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "missao" ADD COLUMN IF NOT EXISTS "token_qr" VARCHAR(64);

UPDATE "missao"
SET "token_qr" = encode(gen_random_bytes(32), 'hex')
WHERE "token_qr" IS NULL;

ALTER TABLE "missao" ALTER COLUMN "token_qr" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "missao_token_qr_key" ON "missao"("token_qr");
