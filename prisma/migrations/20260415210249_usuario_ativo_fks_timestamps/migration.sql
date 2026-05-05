/*
  Warnings:

  - Added the required column `updated_at` to the `usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id_aluno" INTEGER,
ADD COLUMN     "id_curso" INTEGER,
ADD COLUMN     "id_professor" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
