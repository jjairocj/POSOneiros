---
tags: [roadmap, oneiros-pos]
---

# Roadmap y limitaciones conocidas

Cosas identificadas en revisiones previas del proyecto, no priorizadas aún — para no perderlas de vista.

## Observabilidad
- **Sin monitoreo de errores en producción.** Recomendado: Sentry (tiene plan gratuito y SDK oficial para Next.js) — ver [[13-Seguridad]].

## Datos
- **Montos en `Float`**, no enteros. Funciona porque todo se redondea a pesos enteros en cada cálculo (`Math.round` en `app/lib/tax.ts` y `app/actions/sale.ts`), pero un tipo entero (centavos o pesos como `Int`) eliminaría por completo el riesgo de error de coma flotante a nivel de esquema, no solo por convención de código.
- **Importador de historial de ventas de Siigo**: hoy `app/lib/siigo-parser.ts` + `import-products.ts` cubren catálogo; falta importar ventas históricas. Bloqueado en que el usuario aporte un export real de ventas de Siigo para diseñar el parser contra datos reales.
- **Sin modo offline**: si se cae la conexión a Neon, el POS no puede vender (no hay cola local de ventas pendientes de sincronizar). Relevante para un negocio con conectividad poco confiable.

## Testing
- Ver [[10-Testing]]: faltan tests para `dashboard.ts`, `registers.ts`, `report.ts`, `users.ts`, `import-products.ts`.
- No hay tests de integración contra una base Postgres real — toda la suite mockea Prisma. Cubriría mejor los `page.tsx` (excluidos hoy de cobertura) y comportamiento real de transacciones/concurrencia (por ejemplo, la venta de la última unidad de stock desde dos cajas a la vez).

## Infraestructura
- **Backups de Neon**: el plan usado tiene backups automáticos, pero nunca se ha probado una restauración real. Recomendado hacer un simulacro antes de depender de ello en un incidente real.
- **Rate-limit de login en memoria** (ver [[13-Seguridad]]): no sobrevive un redeploy y no escala a múltiples instancias — aceptable al tamaño actual, revisar si el despliegue crece.

## UI/Diseño
- Explorar ajustar dónde se aplica el glassmorphism (blur) para no competir con la legibilidad de números críticos (total a cobrar) — ver [[15-Sistema-de-diseño]].

## ⚠️ Cumplimiento fiscal del recibo (DIAN) — alta prioridad, requiere decisión del negocio
- Desde nov. 2024, el tiquete POS en Colombia debe ser el **Documento Equivalente Electrónico (DEE) POS**: se genera, transmite y valida ante la DIAN en tiempo real, con CUDE y QR — no un ticket estático impreso. `Receipt.tsx` hoy es solo un HTML impreso por el navegador, sin ninguna de esas piezas.
- Casi cualquier negocio activo está obligado (Régimen Simple sin importar ingresos, o cualquier otro régimen si supera ~3.500 UVT/año ≈ $183M COP). Sin confirmar en qué régimen está el negocio ni si ya facturan por fuera del POS (común en negocios pequeños), no se puede saber si esto es una brecha real o ya está cubierto por otro sistema.
- **Antes de tocar código**: confirmar con el negocio/contador su situación tributaria real.
- Mitigación de bajo riesgo mientras se resuelve: agregar al recibo un texto explícito ("comprobante interno, no es factura ni documento equivalente electrónico") para no inducir a error — no implementado todavía, pendiente de que el usuario confirme si procede.
- Si resulta que sí se necesita, es un proyecto de integración con un proveedor tecnológico autorizado por la DIAN (CUFE/CUDE, XML UBL, transmisión en tiempo real) — no un ajuste de UI.

## Permisos granulares por rol/vista
- Hoy el RBAC es jerárquico y fijo en código (`lib/auth.ts`: CASHIER < SUPERVISOR < ADMIN, cada Server Action llama `requireManager()`/`requireAdmin()` directamente) — no hay una matriz configurable de "este rol puede hacer esta acción específica".
- Surgió al construir "Recibir lote" e "Insumos" ([[02-Modelo-de-datos]]): quedaron dentro de `/admin/inventory`, bloqueado para `CASHIER`, pero el negocio espera que sea el cajero quien reciba mercancía y la registre.
- Dos caminos: (a) exponer esas pantallas puntuales a CASHIER sin darle el resto de `/admin`, o (b) construir un sistema de permisos configurable (checkboxes por rol en Ajustes) — cambio real a la arquitectura de autorización, no un ajuste menor.

## Dominio (descartado, no pendiente)
- Se evaluó un subdominio propio (`byoneiros.com`) y se descartó explícitamente por decisión del usuario — el dominio `.vercel.app` es suficiente mientras haya un solo cliente. Ver [[08-Despliegue]].

## Ver también
- [[00-Índice]]
- [[13-Seguridad]]
- [[10-Testing]]
