-- CreateTable
CREATE TABLE "campanha" (
    "id_campanha" SERIAL NOT NULL,
    "nome_campanha" VARCHAR(255) NOT NULL,
    "descricao_campanha" VARCHAR(500),
    "qrcode_campanha" VARCHAR(500),
    "id_associacao" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanha_pkey" PRIMARY KEY ("id_campanha")
);

-- CreateTable
CREATE TABLE "sorteio" (
    "id_sorteio" SERIAL NOT NULL,
    "qrcode_sorteio" VARCHAR(500),
    "id_campanha" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sorteio_pkey" PRIMARY KEY ("id_sorteio")
);

-- CreateIndex
CREATE INDEX "campanha_id_associacao_idx" ON "campanha"("id_associacao");

-- CreateIndex
CREATE INDEX "sorteio_id_campanha_idx" ON "sorteio"("id_campanha");

-- AddForeignKey
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_id_associacao_fkey" FOREIGN KEY ("id_associacao") REFERENCES "associacao"("id_associacao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorteio" ADD CONSTRAINT "sorteio_id_campanha_fkey" FOREIGN KEY ("id_campanha") REFERENCES "campanha"("id_campanha") ON DELETE RESTRICT ON UPDATE CASCADE;
