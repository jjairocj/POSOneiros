#!/bin/sh
# Arranque del contenedor: espera la base, migra, hace el bootstrap inicial y lanza la app.
set -e

: "${DATABASE_URL:?DATABASE_URL no está definida}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET no está definida (openssl rand -base64 32)}"
: "${NEXTAUTH_URL:?NEXTAUTH_URL no está definida (ej. http://192.168.1.50:3000)}"

# Los valores CAMBIAR_* del compose son marcadores: nunca se acepta arrancar con ellos
# (secreto de sesiones o clave de base conocidos = sesiones falsificables / acceso a la base).
fail() { echo "[oneiros] CONFIGURACIÓN INSEGURA: $1"; exit 1; }
case "$NEXTAUTH_SECRET" in *CAMBIAR*|*cambia*) fail "NEXTAUTH_SECRET sigue siendo el marcador. Genera uno propio: openssl rand -base64 32";; esac
[ "${#NEXTAUTH_SECRET}" -ge 32 ] || fail "NEXTAUTH_SECRET debe tener al menos 32 caracteres (openssl rand -base64 32)."
case "$DATABASE_URL" in *CAMBIAR*) fail "La clave de la base de datos (DB_PASSWORD) sigue siendo el marcador.";; esac
case "$NEXTAUTH_URL" in *CAMBIAR*) fail "NEXTAUTH_URL sigue siendo el marcador (ej. http://192.168.1.50:3000).";; esac

echo "[oneiros] Aplicando migraciones..."
i=0
until npx prisma migrate deploy; do
  i=$((i+1))
  if [ "$i" -ge 15 ]; then echo "[oneiros] La base de datos no responde tras $i intentos."; exit 1; fi
  echo "[oneiros] Base de datos no disponible, reintento $i/15 en 4s..."
  sleep 4
done

echo "[oneiros] Bootstrap inicial..."
npx tsx docker/bootstrap.ts

echo "[oneiros] Iniciando en el puerto ${PORT}..."
exec "$@"
