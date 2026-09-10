# Oneiros POS

Punto de venta para negocios de comida y retail en Colombia. Un solo proyecto Next.js hace de frontend (caja táctil y back-office) y backend (Server Actions sobre PostgreSQL).

## Stack

- Next.js 16 (App Router, Server Actions), React 19, TypeScript
- Prisma 7 + PostgreSQL
- NextAuth v4 (credenciales, sesión JWT de 12 h)
- Zustand (carrito persistido en el dispositivo), Tailwind 4 + shadcn/ui
- Vitest + Testing Library

## Puesta en marcha

```bash
cp .env.example .env        # completa DATABASE_URL, NEXTAUTH_SECRET y SEED_ADMIN_*
npm install
npm run db:migrate          # aplica prisma/migrations
npm run db:seed             # crea roles, sucursal, caja y el admin de SEED_ADMIN_*
npm run dev                 # http://localhost:3000
```

Genera el secreto con `openssl rand -base64 32`. El seed se niega a correr en producción salvo que definas `ALLOW_SEED=true` para la primera carga.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | tests unitarios (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | seed inicial |

## Estructura

| Ruta | Contenido |
|---|---|
| `app/pos` | Caja: catálogo, carrito multi-orden, checkout, cuenta dividida, recibo, turnos |
| `app/admin` | Back-office: resumen, inventario e importador Siigo, ventas e historial, usuarios y cajas, configuración |
| `app/actions` | Server Actions (toda la lógica de negocio). Devuelven `{ ok, data }` o `{ ok: false, error }` |
| `app/api/export/[kind]` | CSV de ventas, ventas por producto, inventario y turno |
| `lib/auth.ts` | `requireSession()` / `requireAdmin()`: toda acción de escritura pasa por aquí |
| `lib/result.ts` | `ActionResult`, `UserError`, traducción de errores de Prisma a mensajes de usuario |
| `app/lib/time.ts` | Fechas en `America/Bogota` (el servidor puede correr en UTC) |
| `prisma/` | Esquema, migraciones y seed |

## Reglas de negocio importantes

- El servidor es la fuente de verdad de precios e impuestos; el cliente solo envía ids, cantidades y pagos.
- El stock se descuenta con `updateMany` condicionado a `stock >= cantidad`, así dos cajas no venden la misma última unidad. `allowNegativeStock` en configuración lo desactiva.
- Cuenta dividida = una sola venta con varios pagos (una `SubAccount` por persona).
- Anular una venta (supervisor o admin) devuelve el stock y la deja como `CANCELLED` en el historial.
- Cierre de caja: esperado = base + pagos en efectivo. Tarjeta y transferencia no van al cajón.
- Cada caja lleva su consecutivo (`Register.nextNumber`) que se imprime como `PREFIJO-N`.

## Roles

Modelo de tres niveles (`lib/auth.ts`), jerárquico: cada rol también pasa las verificaciones de los roles por debajo de él.

| Rol | Puede |
|---|---|
| **Cajero** (`CASHIER`) | Solo `/pos`: vender, aplicar descuentos, dividir cuenta, abrir/cerrar su propio turno, clientes, cambiar su contraseña. |
| **Supervisor** (`SUPERVISOR`) | Todo lo del cajero, más: dashboard y reportes, inventario y categorías, movimientos de stock (entrada/merma/ajuste), anular una venta, actuar sobre el turno de otro cajero. No ve Usuarios y Cajas, Ajustes, ni el importador de Siigo. |
| **Administrador** (`ADMIN`) | Todo. Único rol que gestiona personal, cajas físicas, configuración del negocio e importaciones masivas. |

`requireSession(minimumRole?)` en `lib/auth.ts` es la única fuente de verdad para las Server Actions; `requireManager()` y `requireAdmin()` son atajos. El proxy y los layouts de `/admin` hacen un filtro barato (y a veces desactualizado) por conveniencia — la decisión real siempre es la de la acción o la página que vuelve a consultar la sesión.

## Producción

- Base de datos gestionada con backups automáticos (Neon, Supabase, Railway). Prueba una restauración antes de lanzar.
- **Neon:** usa el connection string "Pooled" (host con `-pooler`) como `DATABASE_URL` de la app. Para `prisma migrate deploy/dev` u otros comandos puntuales, usa el endpoint sin `-pooler` (ver `.env.example`) — el pooler de Neon reutiliza sesiones y puede arrastrar configuración (`search_path`) de un cliente anterior. El plan gratuito "duerme" la base tras un rato inactivo; la primera consulta tras eso tarda un poco más (normal, no es un error).
- Variables por ambiente en la plataforma de despliegue; nunca reutilices el `NEXTAUTH_SECRET` local.
- Añade un monitor de errores (Sentry tiene plan gratuito y SDK para Next.js).
- Exporta el CSV del turno al cerrar caja como copia de seguridad legible.
