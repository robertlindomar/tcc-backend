-- Alinha colunas ao padrao pt-BR com sufixo da entidade (ex.: uf_estado).
ALTER TABLE "usuario" RENAME COLUMN "role" TO "role_usuario";
ALTER TABLE "usuario" RENAME COLUMN "ativo" TO "ativo_usuario";

ALTER TABLE "endereco" RENAME COLUMN "cep" TO "cep_endereco";
ALTER TABLE "endereco" RENAME COLUMN "numero" TO "numero_endereco";

ALTER TABLE "estado" RENAME COLUMN "uf" TO "uf_estado";

ALTER TABLE "lojista" RENAME COLUMN "status" TO "status_lojista";

-- RenameIndex (Prisma gera nome a partir do @map da coluna)
ALTER INDEX "lojista_status_idx" RENAME TO "lojista_status_lojista_idx";
