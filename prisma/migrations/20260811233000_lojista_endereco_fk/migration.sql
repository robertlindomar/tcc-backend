-- AlterTable
ALTER TABLE "lojista" ADD COLUMN "id_endereco" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "lojista_id_endereco_key" ON "lojista"("id_endereco");

-- AddForeignKey
ALTER TABLE "lojista" ADD CONSTRAINT "lojista_id_endereco_fkey" FOREIGN KEY ("id_endereco") REFERENCES "endereco"("id_endereco") ON DELETE SET NULL ON UPDATE CASCADE;
