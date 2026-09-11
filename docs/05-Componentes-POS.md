---
tags: [componentes, pos, oneiros-pos]
---

# Componentes — Punto de Venta (`app/pos/`)

Pantalla principal de caja: `app/pos/page.tsx`, Server Component que verifica sesión (`getServerSession`), carga el turno activo (`getActiveShift`) y arma el layout:

```
┌─────────────────────────────────────────────┐
│ ShiftHeader (sticky)                         │
├───────────────────────────┬───────────────────┤
│ ProductGrid (catálogo)    │ CartDrawer         │
│                           │ (solo desktop,     │
│                           │  columna 400px)    │
├───────────────────────────┴───────────────────┤
│ MobileCartBar (solo mobile, flotante + sheet) │
└─────────────────────────────────────────────┘
```

Grid: `grid-cols-1 lg:grid-cols-[1fr_400px]`. El carrito (`CartDrawer`) es un componente **cliente** — el catálogo es donde vive la mayoría de la interacción táctil.

> Nota de mantenimiento: `CartDrawer`'s root div necesita `w-full` explícito — al ser hijo de un `<aside>` con `display:flex`, sin ese ancho se encoge a su contenido en vez de llenar la columna de 400px (bug corregido el 2026-09-10).

## Catálogo (`components/Catalog/`)

- **`ProductGrid.tsx`** — grilla de productos, con búsqueda y filtro por categoría (`CategorySelector.tsx`).
- **`ProductCard.tsx`** — tarjeta individual. Maneja su propio estado `imageFailed`: si `product.imageUrl` falla al cargar (`onError`), cae a un ícono de placeholder (📦) en vez de mostrar el `alt` roto.
- **`CategorySelector.tsx`** — pestañas de categoría, incluye "⭐ Favoritos" y "Todos".
- **`OrderSwitcher.tsx`** — cambia entre **múltiples órdenes activas** (ver [[07-Estado-cliente]]: el carrito soporta más de una orden en paralelo, útil para mesas/pedidos simultáneos).
- **`CartDrawer.tsx`** — el carrito de la orden activa: lista de líneas (`CartItemRow` interno, con edición de descuento por línea inline), subtotal/descuento/total, botón "Proceder al pago". Muestra `ShiftOpeningModal` si no hay turno abierto al intentar cobrar.

## Checkout (`components/Checkout/`)

- **`CheckoutModal.tsx`** — flujo de cobro: selecciona método(s) de pago, cliente opcional, llama a `processSale()`. Ver [[04-Reglas-de-negocio]] para las garantías del servidor.
- **`SplitBillModal.tsx`** — divide la cuenta: por partes iguales o por ítems asignados a cada persona. Se traduce a `SubAccountInput[]` que `processSale` guarda como una sola venta con varias `SubAccount`.
- **`SaleSuccess.tsx`** — confirmación tras una venta exitosa.
- **`Receipt.tsx`** — recibo imprimible/visualizable. Renderiza `business.businessLogoUrl` (si está configurado y `showLogoOnReceipt !== "false"`) con `onError` para ocultarlo con gracia si la URL falla.

## Turnos (`components/Shift/`)

- **`ShiftHeader.tsx`** — barra superior sticky: nombre de usuario, rol, estado del turno (abierto/cerrado), acceso a `POSUserMenu`.
- **`ShiftOpeningModal.tsx`** — pide el efectivo base (`baseAmount`) para abrir turno.
- **`ShiftClosingModal.tsx`** — cierre de caja: compara efectivo esperado (`baseAmount` + ventas en efectivo) contra lo contado.

## Mobile

- **`MobileCartBar.tsx`** — en viewports `< lg`, reemplaza el `CartDrawer` fijo por una barra flotante que abre el carrito como bottom sheet. Mobile-first según el sistema de diseño del proyecto (`AGENTS.md`).

## Menú de usuario

- **`POSUserMenu.tsx`** — cambiar contraseña (`ChangePasswordModal`, componente compartido en `app/components/`), cerrar sesión, ir a `/admin` si el rol lo permite.

## Ver también
- [[07-Estado-cliente]]
- [[04-Reglas-de-negocio]]
