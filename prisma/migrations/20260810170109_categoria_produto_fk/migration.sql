-- CreateTable
CREATE TABLE "categoria" (
    "id_categoria" SERIAL NOT NULL,
    "nome_categoria" VARCHAR(255) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateIndex
CREATE INDEX "produto_categoria_fk_idx" ON "produto"("categoria_fk");

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_categoria_fk_fkey" FOREIGN KEY ("categoria_fk") REFERENCES "categoria"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;
