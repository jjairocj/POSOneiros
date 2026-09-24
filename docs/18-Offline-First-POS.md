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

## Fase 1 — Catálogo local persistido (IndexedDB)

- Nueva capa de cache local (Dexie o `idb`) con productos, precio, impuestos, stock de referencia y promociones activas aplicables.
- Se refresca completo cuando `ProductGrid` detecta `online`, y periódicamente mientras hay conexión estable.
- El stock cacheado es **solo referencial** para la UI (evitar que el cajero intente vender algo en 0) — nunca se usa para decrementar stock real, eso sigue siendo exclusivo del servidor dentro de la transacción.
- El carrito offline usa el mismo motor de cálculo (`breakdownLines`, `app/lib/tax.ts`) que ya usa el preview online, corriendo client-side contra el cache.
- Alcance: solo lectura, bajo riesgo, no toca `processSale`.

## Fase 2 — PWA shell (la app abre sin red)

- `next-pwa` (o Workbox manual) con `CacheFirst` para el shell estático de `/pos` y sus assets, `NetworkFirst` para datos.
- `manifest.json` mínimo — no es para publicar como app instalable al público, solo para que el navegador del dispositivo POS cachee el shell.
- Alcance limitado a `/pos/**`: nunca cachear `/admin` ni nada con datos sensibles fuera del flujo de venta.

## Fase 3 — Reconciliación de ventas rechazadas al reconectar

- Hoy `flushOfflineSalesQueue` distingue error de red (reintenta) de rechazo real del servidor, pero un rechazo real (precio/promo cambió, stock insuficiente) no tiene UI clara — queda colgado en la cola.
- Nuevo estado `needs_review` en la cola + panel en el POS: muestra qué cambió (total esperado vs. total servidor) y dos acciones explícitas — aceptar el nuevo total y confirmar, o anular e imprimir nota. Nunca reintento automático silencioso de una venta rechazada por regla de negocio.

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
