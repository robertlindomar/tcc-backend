-- CreateEnum
CREATE TYPE "UsuarioRole" AS ENUM ('ASSOCIACAO', 'LOJISTA', 'CONSUMIDOR');

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nome_usuario" VARCHAR(255) NOT NULL,
    "email_usuario" VARCHAR(255) NOT NULL,
    "senha_usuario" VARCHAR(255) NOT NULL,
    "role" "UsuarioRole" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "endereco" (
    "id_endereco" SERIAL NOT NULL,
    "cep" VARCHAR(9) NOT NULL,
    "numero" VARCHAR(20),
    "id_usuario" INTEGER NOT NULL,
    "id_rua" INTEGER NOT NULL,
    "id_bairro" INTEGER NOT NULL,
    "id_cidade" INTEGER NOT NULL,
    "id_estado" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "endereco_pkey" PRIMARY KEY ("id_endereco")
);

-- CreateTable
CREATE TABLE "rua" (
    "id_rua" SERIAL NOT NULL,
    "nome_rua" VARCHAR(255) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rua_pkey" PRIMARY KEY ("id_rua")
);

-- CreateTable
CREATE TABLE "estado" (
    "id_estado" SERIAL NOT NULL,
    "nome_estado" VARCHAR(255) NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estado_pkey" PRIMARY KEY ("id_estado")
);

-- CreateTable
CREATE TABLE "cidade" (
    "id_cidade" SERIAL NOT NULL,
    "nome_cidade" VARCHAR(255) NOT NULL,
    "id_estado" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cidade_pkey" PRIMARY KEY ("id_cidade")
);

-- CreateTable
CREATE TABLE "bairro" (
    "id_bairro" SERIAL NOT NULL,
    "nome_bairro" VARCHAR(255) NOT NULL,
    "id_cidade" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bairro_pkey" PRIMARY KEY ("id_bairro")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_usuario_key" ON "usuario"("email_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "endereco_id_usuario_key" ON "endereco"("id_usuario");

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_id_rua_fkey" FOREIGN KEY ("id_rua") REFERENCES "rua"("id_rua") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_id_bairro_fkey" FOREIGN KEY ("id_bairro") REFERENCES "bairro"("id_bairro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_id_cidade_fkey" FOREIGN KEY ("id_cidade") REFERENCES "cidade"("id_cidade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "estado"("id_estado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cidade" ADD CONSTRAINT "cidade_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "estado"("id_estado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bairro" ADD CONSTRAINT "bairro_id_cidade_fkey" FOREIGN KEY ("id_cidade") REFERENCES "cidade"("id_cidade") ON DELETE RESTRICT ON UPDATE CASCADE;
