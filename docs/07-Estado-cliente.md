---
tags: [zustand, cliente, oneiros-pos]
---

# Estado del cliente (Zustand)

Dos stores globales, ambos persistidos en `localStorage` del dispositivo (así el carrito sobrevive a un refresh o cierre accidental del navegador durante una venta).

## `useCartStore` (`app/store/useCartStore.ts`)

Soporta **múltiples órdenes simultáneas** (no solo un carrito): `orders: Record<string, Order>` + `activeOrderId`. Esto es lo que permite tener, por ejemplo, la orden de una mesa en pausa mientras se atiende otra en el mostrador (`OrderSwitcher.tsx` en la UI).

Acciones principales:

| Acción | Qué hace |
|---|---|
| `addOrder(name)` / `removeOrder(id)` | crea/elimina una orden paralela; si se elimina la última, recrea la orden por defecto |
| `addItem(product)` | agrega o incrementa cantidad de un producto en la orden activa |
| `updateQuantity(id, qty)` | si `qty <= 0`, delega en `removeItem` |
| `setLineDiscount(id, discount)` | descuento en COP por línea, acotado a no superar el valor de la línea |
| `setOrderDiscount(discount)` | descuento a nivel de orden completa (`{ type: "percent" \| "amount", value }`) |
| `clearActiveOrder()` | vacía la orden activa tras una venta exitosa |

Cada mutación recalcula los totales con `withTotals()`, que delega en **`calculateOrderTotals()`** de `app/lib/tax.ts` — la misma función matemática que usa el servidor en `processSale()` (ver [[04-Reglas-de-negocio]]), así el total que ve el cajero en pantalla coincide exactamente con lo que el servidor valida al cobrar.

Persistencia: `zustand/middleware.persist`, clave `oneiros-multi-cart`, `version: 2` (con `migrate` que hoy es un passthrough — punto de extensión si el shape cambia en el futuro).

## Cálculo de impuestos y descuentos (`app/lib/tax.ts`)

Compartido entre cliente y servidor — es la razón por la que el total nunca "sorprende" al momento de cobrar:

- `breakdownLines()`: por cada línea, calcula base (precio × cantidad, redondeado), descuento de línea, y le prorratea una porción del descuento de orden (si existe) proporcional a lo que esa línea puede absorber. El impuesto se calcula **sobre la base ya descontada** (práctica colombiana).
- `prorateOrderDiscount()`: reparte un descuento de orden entre líneas proporcionalmente a su base, con el residuo de redondeo cayendo en la última línea que pueda absorberlo — así la suma siempre cuadra exactamente, sin perder ni un peso por redondeo.
- Todo redondeado a pesos enteros (`Math.round`) en cada paso, nunca se arrastran decimales.

## `useSubAccountStore` (`app/store/useSubAccountStore.ts`)

Estado auxiliar para el flujo de **cuenta dividida** (`SplitBillModal.tsx`): quién paga qué, antes de convertirse en `SubAccountInput[]` que se envía a `processSale()`.

## Ver también
- [[05-Componentes-POS]]
- [[04-Reglas-de-negocio]]
