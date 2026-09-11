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
