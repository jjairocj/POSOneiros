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

## CI/CD con Docker Hub (`opplystr/oneiros-pos`)

Antes de nada: en hub.docker.com → Repositories → **Create repository** → nombre `oneiros-pos`, visibilidad **Private** (el plan gratuito incluye 1 privado). Si haces `push` a un repo que no existe, Docker Hub lo crea **público**.

**Publicar desde tu Mac** (usa tu `docker login` actual, sin configurar nada más):

```bash
./docker/publish.sh        # construye linux/amd64 y sube :latest y :<hash-del-commit>
```

(En un Mac Apple Silicon la construcción amd64 es emulada: unos 10 min.)

**Publicar desde GitHub Actions** (`.github/workflows/docker-image.yml`, en cada push a `main`, solo si tests y typecheck pasan): GitHub no puede usar tu sesión local, así que necesita dos *secrets* en el repo (Settings → Secrets and variables → Actions): `DOCKERHUB_USERNAME` = `opplystr` y `DOCKERHUB_TOKEN` = un token de Docker Hub con permiso *Read & Write* (Account settings → Personal access tokens). Los cambios que solo tocan `docs`/`.md` no disparan el build; también se puede lanzar a mano (Actions → *Imagen Docker* → *Run workflow*).

**En el PC Ubuntu** (una vez): `docker login -u opplystr` con un token de Docker Hub de permiso *Read-only*; ese mismo token va en `REPO_PASS` del servicio `watchtower` del compose. Watchtower revisa cada 5 min y solo reinicia contenedores con la etiqueta `com.centurylinklabs.watchtower.enable=true` (la app, nunca la base). A mano: `docker compose pull && docker compose up -d`.

- **Volver atrás:** cambia `:latest` por el hash del commit en `image:` y `docker compose up -d`.
- **Migraciones:** cada versión aplica las suyas al arrancar, contra la base real; volver a una imagen antigua no las deshace. Haz un `pg_dump` antes de cambios grandes de esquema.
- **Vercel** sigue siendo independiente (despliegue por CLI).

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

## Almacenamiento de imágenes de producto (MinIO)

Opcional. Un servidor [MinIO](https://min.io) (S3-compatible) en CasaOS para que el botón "Subir" del formulario de producto (`/admin/inventory`) guarde las imágenes ahí en vez de depender solo de pegar una URL externa a mano.

Instalado vía el App Store de CasaOS: **Big Bear MinIO** (`bigbeartechworld/big-bear-minio`), no un compose propio de este repo — se administra igual que cualquier otra app de CasaOS. Esa app mapea:
- `9000` (API S3, interno) → publicado en `9010`
- `9001` (consola web) → publicado en `9011`

Pasos:

1. Entra a la consola (`http://IP_SERVIDOR:9011`), crea un bucket (ej. `oneiros`) y ponle política de **lectura pública** (Access Policy → Public, o `mc anonymous set download local/oneiros` desde la CLI de `mc`) — las imágenes se sirven directo por URL sin pasar por la app, así que necesitan poder leerse sin autenticación.
2. Expón el puerto **`9010`** (la API, no la consola `9011`) con cloudflared bajo un hostname propio, ej. `https://storage.tudominio.dev`.
3. En el compose de la app, define `S3_ENDPOINT` y `S3_PUBLIC_URL` con esa misma URL, `S3_BUCKET` con el nombre del bucket, y `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` (el root de `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` sirve, o mejor un access key dedicado creado en Identity → Access Keys). Reinicia el contenedor `oneiros-pos` para que tome las nuevas variables.
4. Detalle completo de cada variable en [[14-Configuración-y-variables-de-entorno]].

Sin estas variables configuradas, el campo de imagen sigue funcionando exactamente igual que antes (pegar una URL externa) — MinIO es aditivo, no reemplaza nada. El botón "Buscar en Google" (abre Google Imágenes con el nombre del producto en una pestaña nueva) funciona siempre, con o sin MinIO configurado — solo automatiza encontrar una URL para pegar a mano.

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
