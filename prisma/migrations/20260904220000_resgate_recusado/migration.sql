-- Recusa de resgate pendente: devolve pontos e restaura estoque (se finito).

ALTER TYPE "StatusResgateRecompensa" ADD VALUE IF NOT EXISTS 'RECUSADO';
