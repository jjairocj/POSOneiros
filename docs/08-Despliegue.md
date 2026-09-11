---
tags: [despliegue, vercel, neon, oneiros-pos]
---

# Despliegue

- **Hosting:** Vercel, proyecto `pos-oneiros` (equipo `jjairocjs-projects`).
- **Base de datos:** Neon PostgreSQL (migrada desde Postgres local con `pg_dump`/`pg_restore`, byte a byte, en la migración inicial a producción).
- **Repositorio:** `github.com/jjairocj/POSOneiros`, rama `main`, deploy automático de Vercel al hacer push (o manual con `vercel --prod`).
- **URL de producción:** `https://pos-oneiros.vercel.app`

## Variables de entorno de producción

Configuradas en Vercel, scope **Production** únicamente (no Preview, para no mezclar datos de prueba con la base real):

| Variable | Valor / origen |
|---|---|
| `DATABASE_URL` | Connection string **pooled** de Neon (host con `-pooler`) — la app en serverless abre muchas conexiones cortas, el pooler es lo correcto aquí |
| `NEXTAUTH_SECRET` | Generado con `openssl rand -base64 32`, distinto al de desarrollo local |
| `NEXTAUTH_URL` | `https://pos-oneiros.vercel.app` (la URL real del alias de producción — no la del formato `<proyecto>-<team>.vercel.app`, que es distinta) |

## ⚠️ Neon: pooled vs. direct — por qué importa

- **App en producción (`DATABASE_URL` en Vercel):** usar el endpoint **pooled** (`-pooler`).
- **`prisma migrate deploy`/`dev` y scripts de administración** (como [[09-Scripts-de-mantenimiento|reset-blank.ts]]): usar el endpoint **directo** (sin `-pooler`).

Motivo verificado en este proyecto: el pooler de Neon (PgBouncer en modo transacción) reutiliza la misma conexión de fondo entre distintos clientes. Si una herramienta cambia `search_path` en su sesión (como hizo `pg_restore` durante la migración) y luego otro cliente reutiliza ese mismo backend, sus consultas sin calificar de esquema pueden fallar silenciosamente. Esto causó que `prisma migrate status` reportara falsamente "0 migraciones aplicadas" contra una base que sí las tenía — se resolvió apuntando esos comandos puntuales al endpoint directo.

## `postinstall: prisma generate`

`package.json` tiene `"postinstall": "prisma generate"`. **Es crítico**: ni `@prisma/client` ni `prisma` v7 traen su propio postinstall — sin esta línea, el primer `npm install` de Vercel nunca generaría el cliente de Prisma y `next build` fallaría de entrada. (Este fue exactamente el motivo del build fallido antes de la corrección.)

Deliberadamente **no** se ejecuta `prisma migrate deploy` como parte del build de Vercel — por el riesgo de locks de advisory de Prisma Migrate contra el pooler de Neon. Las migraciones se aplican a mano, apuntando al endpoint directo.

## SEO / no-indexación

La app es una herramienta interna de un solo cliente, en un subdominio `.vercel.app` que **no debe aparecer en buscadores**. Tres capas, todas verificadas en vivo:

1. `app/robots.ts` → `robots.txt` con `Disallow: /` para todos los user-agents.
2. `app/layout.tsx` → `metadata.robots = { index: false, follow: false, nocache: true }`.
3. `next.config.ts` → header `X-Robots-Tag: noindex, nofollow, noarchive` en **todas** las rutas (incluye `/api/*`, que no pasa por el layout raíz).

**Límite conocido y aceptado:** los certificados TLS emitidos para cualquier subdominio HTTPS quedan listados en los logs públicos de Certificate Transparency (requisito de las CAs/navegadores, no se puede desactivar). Esto es independiente de la indexación en buscadores — Google nunca lista el sitio, pero el nombre del subdominio puede aparecer en herramientas que escanean CT logs. Se le explicó esta distinción al usuario explícitamente.

## Dominio personalizado (descartado)

Se evaluó (y luego se descartó por decisión explícita del usuario) un subdominio propio en Cloudflare (`byoneiros.com`) apuntando al proyecto. Conclusión final: **no es necesario** — el dominio `.vercel.app` es suficiente mientras haya un solo cliente. Si se reintenta en el futuro: A record `76.76.21.21` en el proveedor DNS (Cloudflare, sin cambiar nameservers), añadir el dominio en Vercel con `vercel domains add <subdominio> <proyecto>`. Para desvincularlo, el CLI de Vercel **no tiene** un comando directo de "quitar dominio de un proyecto" (`vercel domains rm` solo libera propiedad completa de un dominio en la cuenta) — hay que hacerlo desde el dashboard: `Project → Settings → Domains → Remove`.

## Comandos útiles

```bash
vercel link                          # vincular el directorio local al proyecto
vercel env ls production             # listar env vars (nombres, no valores)
vercel --prod --yes                  # desplegar a producción
vercel inspect <deployment-url>      # ver estado, aliases, build info
vercel logs <deployment-url>         # logs recientes
```

## Checklist antes de cada deploy a producción

1. `npx tsc --noEmit` — typecheck limpio.
2. `npm run build` local — confirma que el build no va a fallar en Vercel antes de gastar un deploy.
3. `git push origin main`.
4. `vercel --prod --yes`.
5. Verificar `READY` con `vercel inspect`, smoke test con `curl` a `/login` y `/robots.txt`, y un vistazo a `vercel logs` en busca de errores.

## Ver también
- [[09-Scripts-de-mantenimiento]]
- [[02-Modelo-de-datos]] (migraciones)
