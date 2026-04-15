-- CreateTable
CREATE TABLE "rua" (
    "id_rua" SERIAL NOT NULL,
    "nome_rua" VARCHAR(255) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rua_pkey" PRIMARY KEY ("id_rua")
);
