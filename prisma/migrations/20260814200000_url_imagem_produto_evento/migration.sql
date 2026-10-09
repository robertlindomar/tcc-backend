-- URL relativa da imagem (/uploads/...). Opcional: produtos e eventos antigos ficam NULL.

ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "url_imagem" VARCHAR(500);
ALTER TABLE "evento" ADD COLUMN IF NOT EXISTS "url_imagem" VARCHAR(500);
