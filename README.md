# tcc-backend

API Express + Prisma do Conecta Comércio.

## Ambiente

Copie `.env.example` para `.env`. Variáveis:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `SECRET_KEY` | JWT |
| `PORT` | HTTP |
| `FUSO_NEGOCIO` | Fuso civil global do TCC (período e validade de missões) |

## Fuso de negócio

`FUSO_NEGOCIO` é **global** nesta versão. Default: `America/Sao_Paulo` (Santa Fé do Sul / demo).

Todo cálculo de dia, semana, mês e fim do dia passa por `src/shared/tempo/` (`FUSO_NEGOCIO_TCC`). Não há timezone por loja.

Evolução futura: operação multi-fuso pode exigir timezone por estabelecimento.
