-- CreateTable
CREATE TABLE "sexo" (
    "id_sexo" SERIAL NOT NULL,
    "nome_sexo" VARCHAR(100) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sexo_pkey" PRIMARY KEY ("id_sexo")
);
