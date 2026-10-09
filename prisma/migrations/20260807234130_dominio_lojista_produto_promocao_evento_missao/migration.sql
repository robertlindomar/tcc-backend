-- CreateTable
CREATE TABLE "produto" (
    "id_produto" SERIAL NOT NULL,
    "nome_produto" VARCHAR(255) NOT NULL,
    "valor_produto" DECIMAL(10,2) NOT NULL,
    "categoria_fk" INTEGER,
    "id_lojista" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id_produto")
);

-- CreateTable
CREATE TABLE "promocao" (
    "id_promocao" SERIAL NOT NULL,
    "descricao_promocao" VARCHAR(500),
    "preco_promocao" DECIMAL(10,2) NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promocao_pkey" PRIMARY KEY ("id_promocao")
);

-- CreateTable
CREATE TABLE "evento" (
    "id_evento" SERIAL NOT NULL,
    "nome_evento" VARCHAR(255) NOT NULL,
    "descricao_evento" VARCHAR(500),
    "id_lojista" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id_evento")
);

-- CreateTable
CREATE TABLE "missao" (
    "id_missao" SERIAL NOT NULL,
    "nome_missao" VARCHAR(255) NOT NULL,
    "descricao_missao" VARCHAR(500),
    "ponto_recompensa_missao" INTEGER NOT NULL DEFAULT 0,
    "id_lojista" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missao_pkey" PRIMARY KEY ("id_missao")
);

-- CreateIndex
CREATE INDEX "produto_id_lojista_idx" ON "produto"("id_lojista");

-- CreateIndex
CREATE INDEX "promocao_id_produto_idx" ON "promocao"("id_produto");

-- CreateIndex
CREATE INDEX "evento_id_lojista_idx" ON "evento"("id_lojista");

-- CreateIndex
CREATE INDEX "missao_id_lojista_idx" ON "missao"("id_lojista");

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_id_lojista_fkey" FOREIGN KEY ("id_lojista") REFERENCES "lojista"("id_lojista") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promocao" ADD CONSTRAINT "promocao_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_lojista_fkey" FOREIGN KEY ("id_lojista") REFERENCES "lojista"("id_lojista") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missao" ADD CONSTRAINT "missao_id_lojista_fkey" FOREIGN KEY ("id_lojista") REFERENCES "lojista"("id_lojista") ON DELETE RESTRICT ON UPDATE CASCADE;
