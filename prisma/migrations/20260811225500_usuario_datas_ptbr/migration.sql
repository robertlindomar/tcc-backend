-- RenameTimestampFields
ALTER TABLE "usuario" RENAME COLUMN "created_at" TO "data_criacao";
ALTER TABLE "usuario" RENAME COLUMN "updated_at" TO "data_atualizacao";
