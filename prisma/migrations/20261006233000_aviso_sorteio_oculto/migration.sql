CREATE TABLE "aviso_sorteio_oculto" (
    "id_resultado_sorteio" INTEGER NOT NULL,
    "id_consumidor" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "aviso_sorteio_oculto_pkey" PRIMARY KEY ("id_resultado_sorteio", "id_consumidor")
);
CREATE INDEX "aviso_sorteio_oculto_id_consumidor_idx" ON "aviso_sorteio_oculto"("id_consumidor");
ALTER TABLE "aviso_sorteio_oculto" ADD CONSTRAINT "aviso_sorteio_oculto_id_resultado_sorteio_fkey" FOREIGN KEY ("id_resultado_sorteio") REFERENCES "resultado_sorteio"("id_resultado_sorteio") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aviso_sorteio_oculto" ADD CONSTRAINT "aviso_sorteio_oculto_id_consumidor_fkey" FOREIGN KEY ("id_consumidor") REFERENCES "consumidor"("id_consumidor") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resultado_sorteio" ADD COLUMN "data_confirmacao_leitura" TIMESTAMP(3);
