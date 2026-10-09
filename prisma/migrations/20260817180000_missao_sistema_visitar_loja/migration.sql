-- E3b: missão de sistema Visitar loja (uma por lojista).
-- Unicidade NÃO é pelo nome: UNIQUE parcial em (id_lojista) WHERE sistema_missao = true.

ALTER TABLE "missao" ADD COLUMN "sistema_missao" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "missao_sistema_por_lojista_key"
  ON "missao" ("id_lojista")
  WHERE "sistema_missao" = true;

INSERT INTO "missao" (
  "nome_missao",
  "descricao_missao",
  "ponto_recompensa_missao",
  "frequencia_missao",
  "data_fim",
  "id_lojista",
  "token_qr",
  "sistema_missao",
  "data_criacao",
  "data_atualizacao"
)
SELECT
  'Visitar loja',
  'Escaneie o QR no balcão uma vez por dia e ganhe pontos.',
  5,
  'DIARIA',
  NULL,
  l."id_lojista",
  md5(random()::text || clock_timestamp()::text || l."id_lojista"::text)
    || md5(l."id_lojista"::text || random()::text || clock_timestamp()::text),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "lojista" l
WHERE NOT EXISTS (
  SELECT 1
  FROM "missao" m
  WHERE m."id_lojista" = l."id_lojista"
    AND m."sistema_missao" = true
);
