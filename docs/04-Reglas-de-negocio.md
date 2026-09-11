---
tags: [negocio, oneiros-pos]
---

# Reglas de negocio

Todas viven en `app/actions/*.ts`. Los Server Actions devuelven siempre `ActionResult<T>` (`lib/result.ts`): `{ ok: true, data }` o `{ ok: false, error }` — **nunca lanzan** para errores esperados (Next.js reemplaza mensajes de `throw` por uno genérico en producción, así que un `throw` perdería el "Stock insuficiente" y similares).

## Ventas (`app/actions/sale.ts`)

`processSale(activeShiftId, items, payments, options)`:

1. **El servidor es la fuente de verdad de precios e impuestos.** El cliente solo manda `productId`, `quantity`, `discount` de línea y cómo se pagó — nunca un precio.
2. Valida: carrito no vacío, cantidades positivas, métodos de pago válidos (`CASH`/`CARD`/`TRANSFER`), descuentos coherentes.
3. El turno debe estar `OPEN`; solo su dueño puede vender en él, salvo que quien lo intente sea `SUPERVISOR` o superior.
4. Descuento de stock **atómico y a prueba de carreras**: `updateMany({ where: { id, stock: { gte: quantity } } })` — si dos cajas intentan vender la última unidad al mismo tiempo, solo una gana. `allowNegativeStock` (en `SystemConfig`) desactiva esta guarda cuando el negocio lo permite.
5. Los pagos deben sumar el total calculado por el servidor, con tolerancia de $1 por redondeo — si no cuadran, se rechaza con un mensaje explicando que un precio pudo haber cambiado.
6. El número de factura (`Register.nextNumber`) se incrementa **dentro de la misma transacción** para que sea consecutivo sin huecos ni colisiones.
7. Cada línea vendida genera un `StockMovement` tipo `SALE` con el saldo resultante (Kardex).
8. Cuenta dividida = **una sola `Sale`** con varias `Payment`/`SubAccount`, no ventas separadas.

`cancelSale(saleId, reason)`:
- Solo `SUPERVISOR`+ (`requireManager()`). Exige un motivo de al menos 3 caracteres.
- Restaura el stock de cada línea (`StockMovement` tipo `CANCEL`), marca los pagos como `REFUNDED` y la venta como `CANCELLED` — **nunca se borra**, queda en el historial con `cancelledAt`/`cancelledById`/`cancelReason` para trazabilidad.

## Catálogo (`app/actions/product.ts`, `category.ts`)

- `createProduct`/`updateProduct`/`deleteProduct` requieren `requireManager()` (SUPERVISOR+).
- `deleteProduct`: **soft-delete** (`isActive = false`) si el producto ya tiene ventas asociadas; si nunca se vendió, se borra de verdad. Evita romper el historial de ventas por una llave foránea faltante.
- `updateProduct` registra un `StockMovement` tipo `ADJUSTMENT` automáticamente cuando el stock cambia por edición manual del formulario (no solo desde el flujo dedicado de ajuste de stock).
- `adjustStock({ productId, type, quantity, reason?, unitCost? })`: entrada manual al Kardex. Tipos: `PURCHASE` (compra, admite `unitCost`), `WASTE` (merma), `ADJUSTMENT` (ajuste libre) — cada uno con sus propias reglas de signo.
- `toggleProductFavorite` solo necesita `requireSession()` (cualquier usuario autenticado) — es una preferencia de UI, no una operación sensible.

## Turnos (`app/actions/shift.ts`)

- Abrir turno = crear `Shift` con `status: "OPEN"` y `baseAmount` (efectivo inicial).
- Cerrar turno: **esperado = `baseAmount` + pagos en efectivo de las ventas del turno.** Tarjeta y transferencia no pasan por el cajón físico, así que no cuentan para el efectivo esperado.
- Un usuario normalmente solo puede operar su propio turno; `SUPERVISOR`+ puede intervenir en el de otro cajero (por ejemplo, para cerrar una caja abandonada).

## Configuración de negocio (`app/actions/settings.ts`)

- `saveSettings()` valida que `businessLogoUrl`, si se define, empiece por `https://` (no se aceptan URLs `http://` ni rutas locales — el logo se muestra tal cual en recibo y POS).
- Solo `ADMIN` puede modificar ajustes (`requireAdmin()` en la página, ver [[03-Autenticación-y-roles]]).

## Importación desde Siigo (`app/actions/import-products.ts`, `app/lib/siigo-parser.ts`)

- Importa catálogo (y en el futuro historial de ventas) desde exports de Siigo. `Sale.source = "SIIGO"` + `externalRef` únicos evitan duplicar una factura ya importada.
- Solo `ADMIN` (bulk import es una de las acciones "que pueden corromper el catálogo si se usan mal").

## Traducción de errores (`lib/result.ts`)

`toUserMessage(err)` traduce errores técnicos de Prisma a mensajes que un cajero puede entender, por ejemplo:

| Código Prisma | Mensaje al usuario |
|---|---|
| `P2002` (unique constraint) | "Ya existe un producto con ese código" / "...usuario con ese correo" / "...cliente con ese documento" según el campo |
| `P2003` (FK violation) | "No se puede completar: hay registros relacionados (ventas, turnos o productos)" |
| `P2025` (not found) | "El registro ya no existe" |
| `ECONNREFUSED` / `P1001` | "No hay conexión con la base de datos" |

## Ver también
- [[02-Modelo-de-datos]]
- [[07-Estado-cliente]] (cómo se calculan los totales en el cliente antes de enviarlos)
