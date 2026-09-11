---
tags: [testing, vitest, oneiros-pos]
---

# Testing

- **Runner:** Vitest + `jsdom` + Testing Library.
- **Cobertura:** `@vitest/coverage-v8`, `npm run test:coverage` (reportes `text` + `html` + `json-summary`).
- Config en `vitest.config.ts`: incluye `app/**/*.{ts,tsx}` y `lib/**/*.ts`; excluye deliberadamente `layout.tsx`, `loading.tsx`, `error.tsx` y **`page.tsx`** (los Server Components de página necesitan una base de datos real corriendo — no encajan en el estilo de esta suite, que mockea Prisma).

## Qué está cubierto (100% en los archivos con test)

| Área | Archivo de test |
|---|---|
| Roles y sesión | `lib/auth.test.ts` |
| Ventas (`processSale`, `cancelSale`) | `actions/sale.test.ts` — usa un helper `makeTx()` reconfigurable para simular la transacción de Prisma |
| Catálogo (`category.ts`, `product.ts`) | `actions/category.test.ts`, `actions/product.test.ts` |
| Ajustes de negocio | `actions/settings.test.ts` |
| Clientes | `actions/customers.test.ts` |
| Turnos | `shift-actions.test.ts` |
| Cálculo de impuestos/descuentos | `lib/tax.test.ts` |
| CSV, dinero, sonido, throttle de login | `lib/csv.test.ts`, `lib/money.test.ts`, `lib/sound.test.ts`, `lib/login-throttle.test.ts` |
| Carrito (Zustand) | `useCartStore.test.ts`, `store/useSubAccountStore.test.ts` |
| Componentes POS | `CheckoutModal.test.tsx`, `ShiftClosingModal.test.tsx`, `ShiftHeader.test.tsx`, `components/pos/*.test.tsx` |

## Qué falta (0% de cobertura, pendiente)

Archivos de `app/actions/` sin test todavía:

- `dashboard.ts` — métricas del resumen ejecutivo
- `registers.ts` — CRUD de cajas
- `report.ts` — reportes de ventas
- `users.ts` — CRUD de usuarios/personal
- `import-products.ts` — importador de Siigo

También pendiente, identificado en la revisión pre-beta pero no priorizado aún:
- Tests de integración contra una base Postgres real (hoy todo mockea Prisma) — daría cobertura a los `page.tsx` excluidos y a interacciones reales de transacción/concurrencia.

## Patrón de mock recomendado (visto en `actions/product.test.ts` y `actions/sale.test.ts`)

En vez de un mock estático de Prisma, usar un helper `makeTx()` reconfigurable por test, que permite simular distintos estados de la base (producto encontrado/no encontrado, stock suficiente/insuficiente, etc.) sin repetir el boilerplate del mock completo en cada `it()`.

## Comandos

```bash
npm test              # correr toda la suite una vez
npm run test:watch    # modo watch
npm run test:coverage # con reporte de cobertura (abre coverage/index.html)
npm run typecheck     # tsc --noEmit, corre por separado de los tests
```

## Ver también
- [[04-Reglas-de-negocio]]
- [[02-Modelo-de-datos]]
