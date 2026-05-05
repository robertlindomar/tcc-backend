-- CreateTable
CREATE TABLE "estado" (
    "id_estado" SERIAL NOT NULL,
    "nome_estado" VARCHAR(255) NOT NULL,
    "data_criacao" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" DATE NOT NULL,

    CONSTRAINT "estado_pkey" PRIMARY KEY ("id_estado")
);

-- CreateTable
CREATE TABLE "cidade" (
    "id_cidade" SERIAL NOT NULL,
    "nome_cidade" VARCHAR(255) NOT NULL,
    "data_criacao" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" DATE NOT NULL,

    CONSTRAINT "cidade_pkey" PRIMARY KEY ("id_cidade")
);

-- CreateTable
CREATE TABLE "bairro" (
    "id_bairro" SERIAL NOT NULL,
    "nome_bairro" VARCHAR(255) NOT NULL,
    "data_criacao" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" DATE NOT NULL,

    CONSTRAINT "bairro_pkey" PRIMARY KEY ("id_bairro")
);
