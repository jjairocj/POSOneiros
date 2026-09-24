#!/bin/sh
# Construye la imagen y la exporta a un .tar para cargarla en el servidor CasaOS.
#   ./docker/build-image.sh              -> linux/amd64 (mini PC / servidor x86)
#   PLATFORM=linux/arm64 ./docker/build-image.sh   -> Raspberry Pi / ZimaBoard ARM
# Pregunta en el servidor con `uname -m`: x86_64 = amd64, aarch64 = arm64.
set -e
cd "$(dirname "$0")/.."
PLATFORM="${PLATFORM:-linux/amd64}"
TAG="${TAG:-oneiros-pos:latest}"
OUT="${OUT:-oneiros-pos.tar}"

GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
echo "Construyendo $TAG para $PLATFORM ..."
docker buildx build --platform "$PLATFORM" --build-arg GIT_SHA="$GIT_SHA" -t "$TAG" --load .
echo "Exportando a $OUT (puede tardar) ..."
docker save "$TAG" -o "$OUT"
ls -lh "$OUT"
echo "Listo. Copia $OUT al servidor y ejecuta:  docker load -i $OUT"
