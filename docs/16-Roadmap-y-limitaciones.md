---
tags: [roadmap, oneiros-pos]
---

# Roadmap y limitaciones conocidas

Cosas identificadas en revisiones previas del proyecto, no priorizadas aún — para no perderlas de vista.

## Observabilidad
- **Sin monitoreo de errores en producción.** Recomendado: Sentry (tiene plan gratuito y SDK oficial para Next.js) — ver [[13-Seguridad]].
- **2026-09-12: instalación iniciada, pendiente.** Se eligió instalar vía Vercel Marketplace (`vercel integration add sentry`) en vez de crear la cuenta directo en sentry.io. Quedó detenida en dos pasos: (1) aceptar términos del marketplace en el navegador (link generado por el CLI), (2) el CLI luego pide un `--plan <PLAN_ID>` de facturación que no se resolvió en el momento. Retomar con `vercel integration add sentry` una vez el usuario decida el plan (el gratuito de Sentry debería alcanzar para este volumen).

## Datos
- **Montos en `Float`**, no enteros. Funciona porque todo se redondea a pesos enteros en cada cálculo (`Math.round` en `app/lib/tax.ts` y `app/actions/sale.ts`), pero un tipo entero (centavos o pesos como `Int`) eliminaría por completo el riesgo de error de coma flotante a nivel de esquema, no solo por convención de código.
- **Importador de historial de ventas de Siigo**: hoy `app/lib/siigo-parser.ts` + `import-products.ts` cubren catálogo; falta importar ventas históricas. Bloqueado en que el usuario aporte un export real de ventas de Siigo para diseñar el parser contra datos reales.
- ✅ **Resuelto parcialmente (2026-09-12, commit `17e3ae5`):** el usuario confirmó que la conexión se cae muy poco (portátil, rara vez ~1h) — no se justifica un offline-first completo (catálogo cacheado, service worker, PWA). En su lugar: si `processSale` falla por red (no por una validación real del negocio) en el checkout de un solo pago, la venta se guarda en el navegador (`app/lib/offlineSalesQueue.ts`, persistida) y se reintenta sola cuando vuelve la conexión (`online` event + poll cada 20s), con un banner de "N venta(s) pendiente(s)". `Sale.clientRef` (nuevo, único) hace cada reintento idempotente. **Alcance deliberadamente acotado**: solo `CheckoutModal` (pago único); `SplitBillModal` (dividir cuenta) se dejó fuera por ser un flujo multi-pago más raro y complejo — si en el futuro se reporta que una venta dividida se pierde por corte de red, ahí sí extenderlo.
- ✅ **Resuelto (2026-09-11, commit `48314b3`):** el export CSV de cierre de turno cramaba todos los pagos de una venta dividida en una sola celda de texto ilegible — ahora son columnas numéricas por método (Efectivo/Tarjeta/Transferencia) + flag "Cuenta dividida".

## Testing
- ✅ **Resuelto (2026-09-12):** `dashboard.ts`, `registers.ts`, `report.ts`, `users.ts`, `import-products.ts` y `lots.ts` (encontrado sin cobertura al revisar, no estaba en la lista original) ya tienen tests — 98 tests nuevos en 7 archivos, suite total 302 → 400. `roles.ts` también se cubrió de paso. `shift.ts` resultó ya tener cobertura previa (`__tests__/shift-actions.test.ts`, 17 tests) que esta lista no había registrado.
- No hay tests de integración contra una base Postgres real — toda la suite mockea Prisma. Cubriría mejor los `page.tsx` (excluidos hoy de cobertura) y comportamiento real de transacciones/concurrencia (por ejemplo, la venta de la última unidad de stock desde dos cajas a la vez).

## Infraestructura
- **Backups de Neon**: el plan usado tiene backups automáticos, pero nunca se ha probado una restauración real. Recomendado hacer un simulacro antes de depender de ello en un incidente real.
- **Rate-limit de login en memoria** (ver [[13-Seguridad]]): no sobrevive un redeploy y no escala a múltiples instancias — aceptable al tamaño actual, revisar si el despliegue crece.

## UI/Diseño
- Explorar ajustar dónde se aplica el glassmorphism (blur) para no competir con la legibilidad de números críticos (total a cobrar) — ver [[15-Sistema-de-diseño]].
- ✅ **Resuelto (batch 6):** reorganización de Ajustes por tabs/secciones (General/Promociones/Roles y Permisos, y Negocio/Operación/Recibo-Ticket dentro de General).

## Cumplimiento fiscal del recibo (DIAN) — descartado por ahora
- Desde nov. 2024, el tiquete POS en Colombia debe ser el **Documento Equivalente Electrónico (DEE) POS** (CUDE, QR, transmisión en tiempo real a la DIAN). `Receipt.tsx` sigue siendo solo un HTML impreso por el navegador.
- **2026-09-12: el usuario confirmó que no aplica de momento** (situación tributaria del negocio actual) — no es una prioridad activa. Si la situación del negocio cambia (crece, cambia de régimen, deja de facturar por fuera del POS), revisar este punto de nuevo — es un proyecto de integración con un proveedor autorizado por la DIAN, no un ajuste de UI.

## Permisos granulares por rol/vista
- ✅ **Resuelto (2026-09-11, commit `e16efd9`):** permisos configurables por rol implementados (`feat(auth): configurable permissions — let a cashier receive inventory`) — ya no es solo la jerarquía fija CASHIER < SUPERVISOR < ADMIN.

## Backlog activo (no resuelto aún)

### Móvil (reportado 2026-09-12) — ✅ resuelto el mismo día
- **Causa raíz encontrada:** `app/components/Nav/Navbar.tsx` era un componente de navegación global **obsoleto** (con rutas muertas `/admin/products` y `/admin/config`, que nunca existieron como tal — las reales son `/admin/inventory` y `/admin/settings`), que `AppShell` seguía renderizando en *todas* las rutas `/admin/*` porque solo excluía `/login` y `/pos`. Quedaba literalmente superpuesto, en el mismo `position:fixed` y mismo `z-index:50`, encima del nav real y correcto que ya construye `app/admin/layout.tsx` (`AdminSidebar` en desktop, `AdminMobileNav` en móvil) — dos navs completos ocupando el mismo espacio en pantalla.
- **Fix:** `AppShell.tsx` ahora también excluye `/admin` (ya tiene su propio nav completo); se eliminó por completo `Navbar.tsx` + `navbar.module.css` (único importador era `AppShell`); se limpió el CSS de `app/pos/layout.tsx` que existía solo para tapar ese navbar viejo (ya redundante).
- **"No hay botón al POS en móvil":** confirmado en código — `AdminSidebar` (desktop) sí tenía el link "Ir al Punto de Venta (TPV)" → `/pos`, pero `AdminMobileNav` nunca lo tuvo. Se agregó como 6º ítem ("TPV", ícono carrito) siempre visible.
- Verificado en vivo (viewport ~500px) en Resumen/Inventario/Ventas/Personal/Ajustes: un solo nav, sin overlap, navegación y tab activa correctas; botón TPV navega a `/pos`. Verificado también en desktop (1400px) que el sidebar sigue igual, sin duplicado.
- Nota de tooling (ya no bloquea, pero queda documentada): `resize_window` (Claude in Chrome) sí cambia el viewport real en este entorno — la limitación anotada en `[[project-beta-hardening]]` sobre esto ya no aplica tal cual.

### Topología de negocio (US4.1, revisado 2026-09-12)
- **CRUD de Sucursales (`Branch`) no existe** — solo `getBranches()` de lectura (usado como dropdown en Usuarios/Cajas). Cajas (`Register`) sí tienen CRUD completo. Falta: `createBranch`/`updateBranch`/`deleteBranch` + formulario en `/admin`.

### Variantes de producto (US4.2, revisado 2026-09-12)
- **No hay variantes reales con stock independiente** (ej. talla/color como unidades de inventario separadas). `ProductFamily` (2026-09-11) cubre el caso de "agrupar para que una promoción aplique a cualquier sabor/variedad", pero no resuelve stock por variante — son necesidades distintas, no confundir una con la otra si se retoma este ítem.

## Dominio (descartado, no pendiente)
- Se evaluó un subdominio propio (`byoneiros.com`) y se descartó explícitamente por decisión del usuario — el dominio `.vercel.app` es suficiente mientras haya un solo cliente. Ver [[08-Despliegue]].

## Ver también
- [[00-Índice]]
- [[13-Seguridad]]
- [[10-Testing]]
