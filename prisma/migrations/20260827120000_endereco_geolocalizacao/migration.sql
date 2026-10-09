-- M2: coordenadas opcionais pertencem ao endereço físico da loja.
-- O par deve estar completamente preenchido ou completamente ausente.

ALTER TABLE "endereco"
  ADD COLUMN "latitude_endereco" DOUBLE PRECISION,
  ADD COLUMN "longitude_endereco" DOUBLE PRECISION;

ALTER TABLE "endereco"
  ADD CONSTRAINT "endereco_coordenadas_completas"
  CHECK (("latitude_endereco" IS NULL) = ("longitude_endereco" IS NULL)),
  ADD CONSTRAINT "endereco_latitude_valida"
  CHECK ("latitude_endereco" IS NULL OR "latitude_endereco" BETWEEN -90 AND 90),
  ADD CONSTRAINT "endereco_longitude_valida"
  CHECK ("longitude_endereco" IS NULL OR "longitude_endereco" BETWEEN -180 AND 180);
