# syntax=docker/dockerfile:1
# ============================================================
# Pendências da Fábrica — imagem de produção
# Constrói o app Next.js (standalone) e prepara o SQLite em /data
# ============================================================

# ---------- 1. Dependências ----------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------- 2. Build ----------
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Gera o client Prisma + o SQL de bootstrap do banco + o build standalone
RUN bunx prisma generate \
 && bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/bootstrap.sql \
 && bun run build

# ---------- 3. Runner ----------
FROM node:22-slim AS runner
WORKDIR /app
# sqlite3 = criação do schema no primeiro boot e backups online
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/custom.db

COPY --from=builder --chown=app:app /app/.next/standalone ./
# Garantia extra: engine do Prisma dentro do standalone
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
# Schema + SQL de bootstrap (documentação do banco dentro da imagem)
COPY --from=builder --chown=app:app /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=app:app /app/prisma/bootstrap.sql ./prisma/bootstrap.sql
# Import da planilha original (opcional, executado via docker compose exec)
COPY --chown=app:app scripts/seed.ts scripts/seed_data.json ./scripts/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && addgroup --system app \
 && adduser --system --ingroup app app \
 && mkdir -p /data \
 && chown -R app:app /data

VOLUME /data
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/pendencias').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
