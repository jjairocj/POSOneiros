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

## Dominio (descartado, no pendiente)
- Se evaluó un subdominio propio (`byoneiros.com`) y se descartó explícitamente por decisión del usuario — el dominio `.vercel.app` es suficiente mientras haya un solo cliente. Ver [[08-Despliegue]].

## Ver también
- [[00-Índice]]
- [[13-Seguridad]]
- [[10-Testing]]
