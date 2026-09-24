#!/bin/sh
# Construye (linux/amd64) y publica la imagen en Docker Hub usando TU sesión actual de docker (`docker login`).
#   ./docker/publish.sh              -> opplystr/oneiros-pos:latest  y  :<hash-del-commit>
#   DOCKER_USER=otro ./docker/publish.sh
# IMPORTANTE: el repositorio debe existir ANTES en hub.docker.com y estar en modo PRIVATE.
# Si no existe, Docker Hub lo crea PÚBLICO al primer push (y cualquiera podría bajar tu app).
set -e
cd "$(dirname "$0")/.."
DOCKER_USER="${DOCKER_USER:-opplystr}"
REPO="$DOCKER_USER/oneiros-pos"
SHA="$(git rev-parse --short HEAD)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Aviso: hay cambios sin commitear; la imagen incluirá el árbol de trabajo actual (tag $SHA no será exacto)."
fi

echo "Construyendo y subiendo $REPO:latest y $REPO:$SHA (linux/amd64)..."
docker buildx build --platform linux/amd64 \
  --build-arg GIT_SHA="$SHA" \
  -t "$REPO:latest" -t "$REPO:$SHA" \
  --push .
echo "Listo. En el PC:  docker pull $REPO:latest   (o deja que Watchtower la actualice)"
