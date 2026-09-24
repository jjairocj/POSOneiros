---
tags: [configuración, env, oneiros-pos]
---

# Configuración y variables de entorno

Plantilla completa en `.env.example` (versionado; nunca lleva valores reales). Copiar a `.env` para desarrollo local.

| Variable | Para qué sirve | Notas |
|---|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL | En Neon: **pooled** (`-pooler`) para la app; **directo** (sin `-pooler`) para `prisma migrate` y scripts admin. Ver [[08-Despliegue]]. |
| `NEXTAUTH_SECRET` | Firma los JWT de sesión | Generar uno **distinto por ambiente** con `openssl rand -base64 32`. Nunca reusar el de local en producción. |
| `NEXTAUTH_URL` | URL pública de la app | En Vercel puede omitirse (lo infiere), pero en este proyecto se fijó explícito porque el alias real (`pos-oneiros.vercel.app`) no coincidía con el formato `<proyecto>-<team>.vercel.app` que se había asumido al principio. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Solo para `npm run db:seed` | Crean el admin inicial. No se usan en runtime — el seed se niega a correr en producción salvo `ALLOW_SEED=true`. |
| `ALLOW_SEED` | Desbloquea `prisma/seed.ts` en producción | Usar solo para la primerísima carga de una base nueva; no para "resetear" una base con datos reales (para eso: `RESET_ADMIN_EMAIL` + `reset-blank.ts`, ver [[09-Scripts-de-mantenimiento]]). |
| `RESET_ADMIN_EMAIL` | Solo para `prisma/reset-blank.ts` | Correo del único admin que queda tras el borrado total. La contraseña se pide interactivamente, nunca por variable de entorno. |
| `S3_ENDPOINT` | URL del servidor S3-compatible (MinIO) | Ej. `https://storage.tudominio.dev` (túnel cloudflared) o `http://192.168.68.201:9010` en LAN — el puerto de la **API**, no el de la consola web. Ver [[17-Despliegue-Docker-CasaOS]]. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credenciales del bucket | En MinIO: `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`, o mejor, un access key dedicado creado desde la consola de MinIO (Identity → Access Keys) en vez del root. |
| `S3_BUCKET` | Nombre del bucket de imágenes de productos | Debe existir de antemano (créalo desde la consola de MinIO) y tener política de lectura pública (ver más abajo) — las imágenes se sirven directo por URL en `<img>`, sin pasar por la app. |
| `S3_PUBLIC_URL` | URL pública base para armar los links de las imágenes | Normalmente igual a `S3_ENDPOINT`. Se usa así: `${S3_PUBLIC_URL}/${S3_BUCKET}/products/<archivo>`. |
| `S3_REGION` | Opcional, por defecto `us-east-1` | MinIO no usa regiones reales; el SDK de AWS igual exige un valor. |

Las cinco variables `S3_*` son todas opcionales y **solo habilitan el botón "Subir" del formulario de producto** (`app/admin/inventory/components/product-form.tsx` → `app/actions/upload.ts` → `app/lib/s3.ts`). Sin configurarlas, el campo de URL de imagen sigue funcionando igual que siempre (pegar un link externo a mano) — la app nunca falla por su ausencia, solo el botón de subida se niega a subir con un mensaje claro. El bucket necesita política de **lectura pública** (no el root ni las credenciales — solo el contenido, para que las imágenes carguen en `<img src>` sin autenticación): desde la consola de MinIO, Buckets → tu bucket → Access Policy → Public (o `mc anonymous set download local/tu-bucket` desde la CLI de MinIO).

## Configuración en base de datos (`SystemConfig`)

A diferencia de las variables de entorno (fijas por ambiente), estos valores viven en la tabla `SystemConfig` (clave/valor) y se editan desde `/admin/settings` sin redeploy — ver `app/actions/settings.ts`:

- `businessLogoUrl` — URL del logo (debe empezar por `https://`), mostrado en POS y recibo.
- `showLogoOnReceipt` — si el logo aparece en el recibo impreso.
- `allowNegativeStock` — permite vender por debajo de cero unidades (ver [[12-Glosario]]).
- Datos del negocio: nombre, NIT, dirección, impuestos por defecto.

## Diferencia clave: env vars vs. `SystemConfig`

Si un valor puede cambiar sin tocar código ni redeploy (branding, políticas de stock) → `SystemConfig`. Si es un secreto o algo que varía por ambiente (dev/prod) y nunca debería estar en la base de datos (credenciales, URLs de infraestructura) → variable de entorno.

## Ver también
- [[08-Despliegue]]
- [[09-Scripts-de-mantenimiento]]
- [[13-Seguridad]]
