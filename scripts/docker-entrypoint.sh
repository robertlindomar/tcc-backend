#!/bin/sh
set -e

# Extrai host/porta do DATABASE_URL (Coolify / Postgres externo).
# Fallback: DB_HOST/DB_PORT (compose local com serviço "db").
if [ -n "${DATABASE_URL:-}" ]; then
  # postgresql://user:pass@host:5432/db?...
  _sem_proto="${DATABASE_URL#*://}"
  _apos_at="${_sem_proto#*@}"
  _hostporta="${_apos_at%%/*}"
  DB_HOST="${DB_HOST:-${_hostporta%%:*}}"
  _porta="${_hostporta##*:}"
  if [ "$_porta" != "$_hostporta" ]; then
    DB_PORT="${DB_PORT:-$_porta}"
  fi
fi

export DB_HOST="${DB_HOST:-db}"
export DB_PORT="${DB_PORT:-5432}"

if [ "${SKIP_DB_WAIT:-false}" != "true" ]; then
  echo "Aguardando Postgres em ${DB_HOST}:${DB_PORT}..."
  until node -e "
const net = require('net');
const host = process.env.DB_HOST || 'db';
const port = Number(process.env.DB_PORT || 5432);
const socket = net.connect({ host, port }, () => {
  socket.end();
  process.exit(0);
});
socket.on('error', () => process.exit(1));
"; do
    sleep 1
  done
  echo "Postgres disponível."
fi

echo "Aplicando migrations (prisma migrate deploy)..."
npx prisma migrate deploy

# Em Coolify/produção: deixe RUN_SEED=false (default). Local/demo: true.
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Executando seed (RUN_SEED=true)..."
  npx prisma db seed
fi

exec "$@"
