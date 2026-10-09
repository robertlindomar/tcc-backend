-- CreateEnum
CREATE TYPE "StatusLojista" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "associacao" (
    "id_associacao" SERIAL NOT NULL,
    "nome_fantasia_associacao" VARCHAR(255) NOT NULL,
    "razao_social_associacao" VARCHAR(255) NOT NULL,
    "cnpj_associacao" VARCHAR(18) NOT NULL,
    "inscricao_estadual_associacao" INTEGER,
    "id_usuario" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "associacao_pkey" PRIMARY KEY ("id_associacao")
);

-- CreateTable
CREATE TABLE "lojista" (
    "id_lojista" SERIAL NOT NULL,
    "nome_fantasia_lojista" VARCHAR(255) NOT NULL,
    "razao_social_lojista" VARCHAR(255) NOT NULL,
    "cnpj_lojista" VARCHAR(18) NOT NULL,
    "inscricao_estadual_lojista" INTEGER,
    "status" "StatusLojista" NOT NULL DEFAULT 'PENDENTE',
    "id_usuario" INTEGER NOT NULL,
    "id_associacao" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lojista_pkey" PRIMARY KEY ("id_lojista")
);

-- CreateTable
CREATE TABLE "consumidor" (
    "id_consumidor" SERIAL NOT NULL,
    "cpf_consumidor" VARCHAR(14) NOT NULL,
    "pontos_consumidor" INTEGER NOT NULL DEFAULT 0,
    "nivel_consumidor" INTEGER NOT NULL DEFAULT 1,
    "id_sexo" INTEGER,
    "id_lojista" INTEGER,
    "id_usuario" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumidor_pkey" PRIMARY KEY ("id_consumidor")
);

-- CreateIndex
CREATE UNIQUE INDEX "associacao_cnpj_associacao_key" ON "associacao"("cnpj_associacao");

-- CreateIndex
CREATE UNIQUE INDEX "associacao_id_usuario_key" ON "associacao"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "lojista_cnpj_lojista_key" ON "lojista"("cnpj_lojista");

-- CreateIndex
CREATE UNIQUE INDEX "lojista_id_usuario_key" ON "lojista"("id_usuario");

-- CreateIndex
CREATE INDEX "lojista_id_associacao_idx" ON "lojista"("id_associacao");

-- CreateIndex
CREATE INDEX "lojista_status_idx" ON "lojista"("status");

-- CreateIndex
CREATE UNIQUE INDEX "consumidor_cpf_consumidor_key" ON "consumidor"("cpf_consumidor");

-- CreateIndex
CREATE UNIQUE INDEX "consumidor_id_usuario_key" ON "consumidor"("id_usuario");

-- CreateIndex
CREATE INDEX "consumidor_id_sexo_idx" ON "consumidor"("id_sexo");

-- CreateIndex
CREATE INDEX "consumidor_id_lojista_idx" ON "consumidor"("id_lojista");

-- AddForeignKey
ALTER TABLE "associacao" ADD CONSTRAINT "associacao_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lojista" ADD CONSTRAINT "lojista_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lojista" ADD CONSTRAINT "lojista_id_associacao_fkey" FOREIGN KEY ("id_associacao") REFERENCES "associacao"("id_associacao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumidor" ADD CONSTRAINT "consumidor_id_sexo_fkey" FOREIGN KEY ("id_sexo") REFERENCES "sexo"("id_sexo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumidor" ADD CONSTRAINT "consumidor_id_lojista_fkey" FOREIGN KEY ("id_lojista") REFERENCES "lojista"("id_lojista") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumidor" ADD CONSTRAINT "consumidor_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
