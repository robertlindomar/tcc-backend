FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Inclui devDependencies (prisma CLI + tsx) — API roda com tsx, sem build tsc
RUN npm ci

COPY . .

RUN npx prisma generate \
    && chmod +x scripts/docker-entrypoint.sh

# Coolify injeta PORT; default 3000 se omitido
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["npm", "start"]
