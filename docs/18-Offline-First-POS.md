---
tags: [roadmap, offline, pos, oneiros-pos]
---

# Offline-first del POS

Contexto: el servidor (CasaOS) corre en una casa distinta a donde opera el POS, comunicados por internet + cloudflared — ya no es la misma LAN/portátil del diseño original. Cualquier corte de internet en cualquiera de las dos casas (no solo un apagón del servidor) tumba la conexión. Retoma y reemplaza la decisión de 2026-09-12 documentada en [[16-Roadmap-y-limitaciones]], que había descartado esto por bajo riesgo — el riesgo cambió con la topología, no la decisión original estuvo mal.

Trabajo en el branch `feat/pos-offline-first`, sobre `main`. No mergear hasta validar cada fase.

## Punto de partida (ya existe, no reinventar)

- **Cola de ventas offline con reintento**: `app/lib/offlineSalesQueue.ts` (Zustand persistido en localStorage) + `app/pos/components/OfflineSalesSync.tsx` (reintenta por evento `online` + poll cada 20s, banner de pendientes).
- **Idempotencia real**: cada venta encolada lleva `clientRef` (UUID); `Sale.clientRef` es `@unique` en `prisma/schema.prisma` — un reintento de una venta ya recibida no duplica, devuelve la existente.
- **Fallback de catálogo en memoria**: `app/pos/components/Catalog/ProductGrid.tsx` detecta fallo de red y no borra lo ya renderizado, reintenta al reconectar — pero no persiste nada, un refresh de página en pleno corte deja el POS sin productos.
- **Servidor como verdad final**: precios, impuestos, stock y promociones se recalculan siempre dentro de la transacción de `processSale` (`app/actions/sale.ts`), nunca confía en lo que mandó el cliente.
- **Sesión JWT de 12h** (`app/api/auth/[...nextauth]/route.ts`) — más que suficiente para cualquier corte, no requiere cambios.
- **Alcance ya acotado deliberadamente**: la cola offline solo cubre `CheckoutModal` (pago único); `SplitBillModal` (cuenta dividida) queda fuera por ahora.

## Estado

- ✅ Fase 1 — catálogo local en IndexedDB.
- ✅ Fase 2 — PWA shell (`/pos` abre sin red).
- ✅ Fase 3 — panel de reconciliación de ventas rechazadas.
- ⏳ Pendiente: probar todo junto en el navegador (Chrome DevTools, red cortada de verdad) antes de mergear a `main`.

## Fase 1 — Catálogo local persistido (IndexedDB)

- Nueva capa de cache local (Dexie o `idb`) con productos, precio, impuestos, stock de referencia y promociones activas aplicables.
- Se refresca completo cuando `ProductGrid` detecta `online`, y periódicamente mientras hay conexión estable.
- El stock cacheado es **solo referencial** para la UI (evitar que el cajero intente vender algo en 0) — nunca se usa para decrementar stock real, eso sigue siendo exclusivo del servidor dentro de la transacción.
- El carrito offline usa el mismo motor de cálculo (`breakdownLines`, `app/lib/tax.ts`) que ya usa el preview online, corriendo client-side contra el cache.
- Alcance: solo lectura, bajo riesgo, no toca `processSale`.

## Fase 2 — PWA shell (la app abre sin red) ✅

- Implementado con un service worker manual (`public/sw.js`), no una librería (`next-pwa` no soporta bien Turbopack/Next 16; Serwist era la alternativa recomendada por los docs de Next pero se optó por control total con ~50 líneas dado el alcance acotado a `/pos`).
- Estrategia: cachea en tiempo de ejecución cada GET dentro de `/pos/**` y `/_next/**` a medida que el navegador los pide (no hay lista de precache — Turbopack hashea los nombres de chunk, no son conocidos de antemano). Si el fetch falla, sirve la última copia cacheada; si es una navegación y no hay nada cacheado para esa URL exacta, cae al shell de `/pos`.
- Deliberadamente **nunca intercepta POST** (los Server Actions, incluido `processSale`) — pasan derecho a la red para que seguir funcionando igual que hoy la cola de `offlineSalesQueue.ts`.
- Registrado solo en `app/pos/layout.tsx` (`ServiceWorkerRegister.tsx`), con `scope: '/pos'` — nunca cachea `/admin`.
- `app/manifest.ts` mínimo (sin íconos reales todavía — agregar PNGs 192x192/512x512 en `public/` antes de depender del prompt de instalación).
- Nota descartada: Next.js 16 trae `experimental.useOffline` (detecta conectividad y reintenta automáticamente navegaciones/Server Actions) — se decidió **no activarlo**, porque interceptaría también `processSale` a nivel de framework y dejaría la petición colgada esperando reconexión en vez de rechazarla rápido, rompiendo el supuesto que `offlineSalesQueue.ts` necesita (que el `fetch` falle pronto para poder encolar la venta localmente).

## Fase 3 — Reconciliación de ventas rechazadas al reconectar ✅

- `flushOfflineSalesQueue` ya distinguía error de red (reintenta) de rechazo real del servidor; lo que faltaba era la UI — antes se descartaba en silencio con solo un `console.error`.
- Nuevo estado `needsReview: RejectedSale[]` en `app/lib/offlineSalesQueue.ts` (persistido igual que `pending`) + `ReviewPanel.tsx` en el POS: por cada venta rechazada muestra el resumen (cantidad de productos, total) y el motivo exacto que dio el servidor, con dos acciones — **Reintentar** (`retryReviewSale`, útil si fue algo transitorio como stock) o **Descartar** (con confirmación; el cajero sabe que debe volver a cobrar si aplica).
- Se descartó la idea original de "aceptar el nuevo total": el servidor no tiene una API para aceptar parcialmente un total distinto al que se cobró — solo recalcula todo desde cero. Reintentar simplemente vuelve a intentar el mismo cobro tal cual, que sirve para fallas transitorias (stock, turno) pero no para un precio/promo que cambió de forma permanente; en ese caso la única salida honesta es descartar y volver a cobrar.

## Orden de trabajo

1. Catálogo local en IndexedDB — bajo riesgo, solo lectura.
2. PWA shell.
3. Panel de reconciliación.
4. (Descartado) Duración de sesión — ya es 12h, suficiente.

## Ambiente de pruebas en CasaOS

Mientras se desarrolla este branch, desplegar una imagen aparte con tag `preview` (no `latest`) en un contenedor/base de datos separados en el mismo CasaOS, para no tocar el ambiente de producción real:
- Imagen: `opplystr/oneiros-pos:preview` (tag distinto de `latest`, publicado desde este branch vía `docker/publish.sh` con `TAG=preview` o manualmente).
- Base de datos: una base Postgres aparte en el mismo servidor `.201` (ej. `pos_preview`), copiada de la real con el mismo procedimiento de migración ya documentado en [[17-Despliegue-Docker-CasaOS]], para probar con datos realistas sin arriesgar la producción.
- Contenedor y compose aparte (`oneiros-pos-preview`), sin Watchtower apuntando a `latest` — actualización manual mientras se itera.
- Cuando el branch esté validado y se mergee a `main`, el flujo normal de CI/CD retoma el tag `latest` de producción.

## Ver también
- [[16-Roadmap-y-limitaciones]]
- [[17-Despliegue-Docker-CasaOS]]
- [[05-Componentes-POS]]
- [[07-Estado-cliente]]
