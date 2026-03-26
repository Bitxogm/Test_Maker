FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── Dependencias ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY api/package.json ./api/
WORKDIR /app/api
RUN npm install

# ── Build ──────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY api/ ./api/
WORKDIR /app/api
RUN npx prisma generate
RUN npm run build

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/api/node_modules ./api/node_modules
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/package.json ./api/package.json
COPY --from=builder /app/api/prisma ./api/prisma

COPY api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]