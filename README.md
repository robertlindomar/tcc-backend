# tcc-backend

API Express + Prisma do Conecta Comércio.

## Ambiente

Copie `.env.example` para `.env`. Variáveis:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `SECRET_KEY` | JWT |
| `PORT` | HTTP (default `3000`) |
| `FUSO_NEGOCIO` | Fuso civil global do TCC (período e validade de missões) |
| `RUN_SEED` | `true` só em demo; em Coolify/produção use `false` |

## Docker local (API + Postgres)

```bash
docker compose up --build
```

API em `http://localhost:3000` (`0.0.0.0`, útil para mobile na LAN). Entrypoint: migrate + seed se `RUN_SEED=true`.

## Coolify (VM)

Recomendado: **dois apps Dockerfile** + **Postgres do Coolify**.

### 1) Postgres
Crie um Database PostgreSQL no Coolify e copie a `DATABASE_URL` interna.

### 2) API (`tcc-backend`)
- Build Pack: **Dockerfile**
- Base Directory: `tcc-backend` (ou root do repo se o repo for só o backend)
- Dockerfile: `Dockerfile`
- Ports Exposes: `3000`
- Healthcheck path: `/health` (ou desative se preferir)
- Env:

| Key | Valor |
|---|---|
| `DATABASE_URL` | URL do Postgres Coolify |
| `SECRET_KEY` | segredo forte |
| `PORT` | `3000` |
| `FUSO_NEGOCIO` | `America/Sao_Paulo` |
| `RUN_SEED` | `false` (ou `true` uma vez na 1ª subida) |

Persistent storage: monte um volume em `/app/uploads`.

### 3) Front
Ver README do `front/` — `NEXT_PUBLIC_API_URL` = URL **pública HTTPS** da API (Build Variable).

### Alternativa: Compose
Na raiz do TCC use `docker-compose.coolify.yml` como Compose file no Coolify.

## Fuso de negócio

`FUSO_NEGOCIO` é **global** nesta versão. Default: `America/Sao_Paulo` (Santa Fé do Sul / demo).

Todo cálculo de dia, semana, mês e fim do dia passa por `src/shared/tempo/` (`FUSO_NEGOCIO_TCC`). Não há timezone por loja.

Evolução futura: operação multi-fuso pode exigir timezone por estabelecimento.
