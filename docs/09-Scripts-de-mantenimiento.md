---
tags: [scripts, mantenimiento, oneiros-pos]
---

# Scripts de mantenimiento

## `prisma/seed.ts` — carga inicial

```bash
npm run db:seed
```

Crea (con `upsert`, así se puede correr más de una vez sin duplicar): los 3 roles, una sucursal (`Sucursal Principal`), una caja (`Caja Principal`), un usuario admin a partir de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (variables de entorno, nunca hardcodeadas), y algunos productos de ejemplo.

**Bloqueado en producción** salvo que se pase `ALLOW_SEED=true` explícitamente — pensado solo para la primera carga de una base nueva, no para "resetear" una base que ya tiene datos reales (para eso existe `reset-blank.ts`, abajo).

## `prisma/reset-blank.ts` — dejar la base en blanco para un cliente nuevo

```bash
DATABASE_URL="<direct, sin -pooler>" \
RESET_ADMIN_EMAIL="jhon_jairo@live.com" \
npm run db:reset-blank
```

Añadido el 2026-09-10 para el flujo de "entregar una base limpia a un cliente nuevo" sin tener que reconstruir el proyecto de Prisma desde cero. A diferencia del seed:

- **Nunca se ejecuta automáticamente** (no está en ningún build ni deploy) — es explícitamente invocado a mano cuando se necesita.
- Borra **absolutamente todo** el contenido transaccional y de catálogo (ventas, pagos, turnos, productos, categorías, clientes, movimientos de stock, usuarios, roles, cajas, sucursales, configuración) y lo reconstruye desde cero: los 3 roles, una sucursal, una caja, y **un único usuario `ADMIN`** con el correo que se le pase en `RESET_ADMIN_EMAIL`.
- Pide **dos confirmaciones escritas por terminal** antes de borrar nada: escribir literalmente `"BORRAR TODO"`, y luego repetir el correo exacto del admin que se va a crear.
- La contraseña del nuevo admin se pide de forma **interactiva** (nunca como variable de entorno ni argumento) — así nunca queda en el historial de shell ni en logs.
- Usa el **endpoint directo** de Neon (sin `-pooler`) igual que `prisma migrate` — ver [[08-Despliegue]] para el porqué.

Orden de borrado (respeta las llaves foráneas, hijos antes que padres): `Payment → SaleDetail → SubAccount → Sale → StockMovement → Shift → Customer → Product → Category → Register → Branch → User → Role → SystemConfig`.

## Exports CSV (`app/api/export/[kind]/route.ts`)

Cuatro tipos, todos generan CSV con BOM UTF-8 y separador `;` (para que Excel en español los abra bien sin corromper acentos):

| `kind` | Contenido | Permiso |
|---|---|---|
| `sales` | Ventas del rango de fechas (`?from&to`) | `requireAdmin()` o similar según la ruta |
| `sales-detail` | Detalle línea por línea | ídem |
| `inventory` | Snapshot del catálogo/stock | ídem |
| `shift` | Cierre de un turno específico (`?id=`) | cualquier usuario autenticado, pero solo puede exportar **su propio** turno salvo que sea `ADMIN` |

El número de recibo en el CSV usa el mismo formato que el recibo impreso: `PREFIJO-N` si el registro tiene prefijo, si no el número consecutivo pelado, o los primeros 8 caracteres del id en mayúsculas como último recurso.

Recomendación operativa (en el README original): exportar el CSV del turno al cerrar caja como respaldo legible independiente de la base de datos.

## Comandos de Prisma de uso frecuente

```bash
npm run db:migrate     # prisma migrate deploy (usar DATABASE_URL directo en prod)
npx prisma migrate status
npx prisma studio       # explorar la base visualmente (¡ojo si apunta a producción!)
```

## Ver también
- [[02-Modelo-de-datos]]
- [[08-Despliegue]]
