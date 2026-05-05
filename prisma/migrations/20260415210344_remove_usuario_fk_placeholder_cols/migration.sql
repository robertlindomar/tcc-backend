/*
  Warnings:

  - You are about to drop the column `id_aluno` on the `usuario` table. All the data in the column will be lost.
  - You are about to drop the column `id_curso` on the `usuario` table. All the data in the column will be lost.
  - You are about to drop the column `id_professor` on the `usuario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "usuario" DROP COLUMN "id_aluno",
DROP COLUMN "id_curso",
DROP COLUMN "id_professor";
