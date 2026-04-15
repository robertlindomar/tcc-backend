# TCC API

API REST em **Node.js**, **Express** e **Prisma** (PostgreSQL), organizada por modulos em `src/modules/<recurso>/`.

## Requisitos

- Node.js 18+
- PostgreSQL acessivel via `DATABASE_URL` no arquivo `.env`

## Configuracao

1. Copie `.env` com `DATABASE_URL=postgresql://usuario:senha@localhost:5432/sua_base`
2. Instale dependencias: `npm install`
3. Aplique migracoes: `npx prisma migrate dev`
4. O client Prisma e gerado no `postinstall` ou com: `npm run db:generate`

## Scripts

| Comando | Descricao |
|--------|------------|
| `npm run dev` | Sobe o servidor com `tsx watch` em `src/server.ts` |
| `npm run db:generate` | Regenera o client Prisma |

## Endpoints (prefixo na raiz da app)

O servidor monta as rotas em `src/routes.ts`:

| Prefixo | Recurso |
|---------|---------|
| `/rua` | Ruas |
| `/estado` | Estados |
| `/cidade` | Cidades |
| `/bairro` | Bairros |

Cada modulo expoe CRUD basico: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` (corpo JSON com `{ "nome": "..." }` onde aplicavel).

## Tratamento de erros

Respostas de erro JSON: `{ "error": "mensagem" }`. Erros de dominio usam `AppError` com codigo HTTP adequado; demais retornam 500.
