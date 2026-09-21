---
tags: [despliegue, docker, casaos]
---

# Despliegue en Docker / CasaOS (red local)

Viable y pensado para uso privado: la app corre en un contenedor, con **su propio PostgreSQL** en otro contenedor (ya no depende de Neon ni de Vercel) y se usa solo desde la red local por HTTP.

## Qué se creó

| Archivo | Para qué |
|---|---|
| `Dockerfile` | Imagen de la app (Node 22 alpine, `next build` + `next start`). |
| `docker/entrypoint.sh` | Al arrancar: espera la base → `prisma migrate deploy` → bootstrap → inicia la app. |
| `docker/bootstrap.ts` | Base **vacía**: crea roles, sucursal, caja y el administrador (sin datos de demostración). Si ya hay usuarios no toca nada. |
| `docker-compose.casaos.yml` | App + PostgreSQL 16, con metadatos `x-casaos` para importarlo en CasaOS. |
| `docker/build-image.sh` | Construye la imagen y la exporta a `oneiros-pos.tar`. |

## 1. Construir la imagen (en tu computador con Docker)

Averigua la arquitectura del servidor (`uname -m`: `x86_64` → amd64, `aarch64` → arm64) y:

```bash
./docker/build-image.sh                      # amd64
PLATFORM=linux/arm64 ./docker/build-image.sh # ARM (Raspberry Pi, ZimaBoard…)
```

Genera `oneiros-pos.tar` (~1 GB comprimible). En un Mac Apple Silicon construir para amd64 usa emulación y tarda bastante más; es normal.

## 2. Llevarla al servidor

```bash
scp oneiros-pos.tar usuario@IP-DEL-SERVIDOR:/tmp/
ssh usuario@IP-DEL-SERVIDOR "docker load -i /tmp/oneiros-pos.tar && rm /tmp/oneiros-pos.tar"
```

(Alternativa: subirla a un registro privado —GHCR o Docker Hub— y cambiar `image:` en el compose.)

## 3. Instalar en CasaOS

1. CasaOS → **App Store → Custom Install → Import** → pega el contenido de `docker-compose.casaos.yml`.
2. Cambia **antes de instalar** estos valores (o defínelos en un `.env` junto al compose si usas `docker compose`):

| Variable | Qué poner |
|---|---|
| `DB_PASSWORD` | Clave de la base (la usan `db` y `DATABASE_URL`; deben coincidir). Defínela **antes del primer arranque**: PostgreSQL la fija al crear el volumen. |
| `NEXTAUTH_SECRET` | Un secreto propio: `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | La dirección con la que abres la app, p. ej. `http://192.168.1.50:3000`. **Debe ser exactamente la que escribes en el navegador** (IP o nombre, con puerto, sin `/` final). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Primer administrador (mín. 8 caracteres). Solo se usan con la base vacía. |

Los valores `CAMBIAR_*` del compose son **marcadores**: si dejas alguno, el contenedor se niega a arrancar con un mensaje claro (así nunca queda corriendo con un secreto o una clave conocidos). El `NEXTAUTH_SECRET` debe tener al menos 32 caracteres.

3. Instala. La primera vez tarda ~1 minuto (migraciones). Abre `http://IP:3000` e inicia sesión.

Si abres la app con otra dirección (p. ej. por nombre en vez de IP) y el login falla o redirige mal, es que `NEXTAUTH_URL` no coincide.

## Variante: usar un PostgreSQL que ya tienes (base externa)

`docker-compose.casaos-db-externa.yml` es la misma imagen pero **sin** contenedor de base de datos: la app se conecta a un PostgreSQL existente. Solo cambia `DATABASE_URL`:

```
postgresql://USUARIO:CLAVE@IP:5432/BASE      # símbolos en la clave codificados: ! = %21, @ = %40, # = %23
```

Si esa base ya viene copiada/migrada (con sus usuarios), `ADMIN_EMAIL`/`ADMIN_PASSWORD` no se usan. Las migraciones pendientes se aplican solas al arrancar. Verificado contra una copia real de la base de producción en otro equipo de la red: arranque sano, 18 migraciones ya aplicadas (sin cambios), login y todas las páginas del admin cargando datos reales.

## CI/CD: publicar y actualizar sin tocar el servidor

```
git push origin main  ->  GitHub Actions: typecheck + tests  ->  imagen linux/amd64  ->  GHCR (privada)
                                                                  ->  Watchtower en el PC la detecta y reinicia la app
```

- **Workflow:** `.github/workflows/docker-image.yml`. Solo publica si los tests pasan. Etiquetas: `latest` y el hash corto del commit (`ghcr.io/jjairocj/oneiros-pos:<sha>`, sirve para volver atrás). También se lanza a mano en GitHub → Actions → *Imagen Docker* → *Run workflow*. Los `.md`/`docs` no disparan el build.
- **Sin secretos extra:** el workflow publica con el `GITHUB_TOKEN` propio de GitHub. La imagen queda **privada** (paquete vinculado al repo).
- **Configuración única en el PC:** `docker login ghcr.io -u jjairocj` con un token clásico de GitHub con solo el permiso `read:packages` (GitHub → Settings → Developer settings → Tokens). El mismo token va en `REPO_PASS` del servicio `watchtower` del compose.
- **Actualización automática:** Watchtower revisa cada 5 min y solo toca los contenedores con la etiqueta `com.centurylinklabs.watchtower.enable=true` (la app, nunca la base). Para actualizar a mano: `docker compose pull && docker compose up -d`.
- **Migraciones:** cada versión nueva aplica sus migraciones al arrancar, contra la base real. Antes de cambios grandes de esquema haz una copia (`pg_dump`, ver abajo). Volver a una imagen anterior no deshace migraciones ya aplicadas.
- **Vercel** sigue siendo independiente (despliegue por CLI); este flujo solo cubre la imagen del servidor local.

## Datos y copias de seguridad

Los datos viven en `/DATA/AppData/oneiros-pos/postgres` (volumen del contenedor `db`). **Haz copias**: por ejemplo un cron en el servidor:

```bash
docker exec oneiros-db pg_dump -U oneiros oneirospos | gzip > /DATA/backups/oneiros-$(date +%F).sql.gz
```

Restaurar: `gunzip -c respaldo.sql.gz | docker exec -i oneiros-db psql -U oneiros oneirospos` (sobre una base vacía).

### Traer los datos actuales de Neon

Opcional, si quieres migrar lo que ya tienes:

```bash
pg_dump --no-owner --no-acl "<URL directa de Neon, sin -pooler>" | docker exec -i oneiros-db psql -U oneiros oneirospos
```

Hazlo con la app recién instalada y **antes** de crear ventas nuevas; si el bootstrap ya creó el administrador, restaura sobre una base vacía (borra el volumen o usa `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`).

## Actualizar a una versión nueva

Construye y carga la imagen nueva (pasos 1–2) y reinicia el contenedor `oneiros-pos`: las migraciones se aplican solas al arrancar.

## Seguridad y límites

- Solo HTTP en la red local. No lo expongas a internet tal cual; si lo haces, ponlo detrás de HTTPS (proxy inverso) y usa `https://` en `NEXTAUTH_URL`.
- El limitador de intentos de login vive en memoria: un reinicio lo reinicia.
- Sin modo offline completo: el navegador necesita alcanzar el servidor (la cola de ventas pendientes cubre cortes breves).

## Qué se verificó

Con Docker real (imagen arm64 nativa y construcción para amd64 con `build-image.sh`):

- `docker build` completo y `docker compose config` válido.
- Con los marcadores `CAMBIAR_*` el contenedor **se niega a arrancar** (mensaje claro).
- Con valores propios: PostgreSQL sano → migraciones (las 18, desde cero) → administrador creado una sola vez → app "healthy".
- Login real por HTTP (clave errónea 401, correcta 200), sesión, `/admin` protegido sin sesión (307) y datos intactos tras reiniciar los contenedores.
- La imagen pesa ~1,8 GB (el `.tar` comprime bastante menos que eso al enviarlo por red con `gzip`).
