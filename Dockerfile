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
    NODE_ENV=production
# El secreto es solo un marcador para que el build no falle; no llega a la imagen final.
RUN NEXTAUTH_SECRET=build-time-placeholder npm run build && rm -rf .next/cache

# ── Runtime ───────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Bogota
# --chown en cada COPY (un `chown -R` posterior duplicaría todas las capas y duplicaría el peso).
COPY --chown=node:node --from=builder /app/package.json /app/package-lock.json /app/prisma.config.ts ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/next.config.ts /app/tsconfig.json ./
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/lib ./lib
COPY --chown=node:node --from=builder /app/docker ./docker
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/login >/dev/null 2>&1 || exit 1
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["npm", "run", "start"]
