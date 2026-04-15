-- CreateEnum
CREATE TYPE "UsuarioRole" AS ENUM ('ASSOCIACAO', 'LOJISTA', 'CONSUMIDOR');

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nome_usuario" VARCHAR(255) NOT NULL,
    "email_usuario" VARCHAR(255) NOT NULL,
    "senha_usuario" VARCHAR(255) NOT NULL,
    "role" "UsuarioRole" NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_usuario_key" ON "usuario"("email_usuario");
