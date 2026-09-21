# syntax=docker/dockerfile:1
# Oneiros POS — imagen para despliegue propio (CasaOS / Docker). Ver docs/17-Despliegue-Docker-CasaOS.md
#
# No usa el modo "standalone" de Next: la imagen conserva node_modules completo
# porque al arrancar corre `prisma migrate deploy` y el bootstrap inicial. Pesa
# más (~1 GB) pero es lo más simple y robusto para un servidor doméstico.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Dependencias ──────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# `postinstall` corre `prisma generate`, que lee prisma.config.ts: necesita una
# DATABASE_URL de forma válida aunque no se conecte a nada durante el build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci

# ── Build ─────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXTAUTH_SECRET="build-time-placeholder" \
    NODE_ENV=production
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Bogota
COPY --from=builder /app/package.json /app/package-lock.json /app/prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts /app/tsconfig.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/docker ./docker
RUN chmod +x docker/entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/login >/dev/null 2>&1 || exit 1
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["npm", "run", "start"]
