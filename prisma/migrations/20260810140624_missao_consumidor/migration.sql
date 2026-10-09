-- CreateTable
CREATE TABLE "missao_consumidor" (
    "id_missao_consumidor" SERIAL NOT NULL,
    "id_missao" INTEGER NOT NULL,
    "id_consumidor" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missao_consumidor_pkey" PRIMARY KEY ("id_missao_consumidor")
);

-- CreateIndex
CREATE INDEX "missao_consumidor_id_missao_idx" ON "missao_consumidor"("id_missao");

-- CreateIndex
CREATE INDEX "missao_consumidor_id_consumidor_idx" ON "missao_consumidor"("id_consumidor");

-- CreateIndex
CREATE UNIQUE INDEX "missao_consumidor_id_missao_id_consumidor_key" ON "missao_consumidor"("id_missao", "id_consumidor");

-- AddForeignKey
ALTER TABLE "missao_consumidor" ADD CONSTRAINT "missao_consumidor_id_missao_fkey" FOREIGN KEY ("id_missao") REFERENCES "missao"("id_missao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missao_consumidor" ADD CONSTRAINT "missao_consumidor_id_consumidor_fkey" FOREIGN KEY ("id_consumidor") REFERENCES "consumidor"("id_consumidor") ON DELETE RESTRICT ON UPDATE CASCADE;
