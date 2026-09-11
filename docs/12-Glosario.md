---
tags: [glosario, oneiros-pos]
---

# Glosario

**Turno (Shift)**
: Periodo de trabajo de un cajero en una caja específica, desde que abre (con un efectivo base) hasta que cierra (contando el efectivo real contra el esperado). Ver [[04-Reglas-de-negocio]].

**Caja (Register)**
: Punto de cobro físico dentro de una sucursal. Tiene un prefijo de facturación (ej. `POS-1`) y un consecutivo (`nextNumber`) que forma el número de recibo.

**Sucursal (Branch)**
: Ubicación física del negocio. Agrupa cajas y empleados.

**Orden (Order, en el carrito)**
: Carrito en curso dentro del POS. El sistema soporta varias órdenes activas en paralelo (`useCartStore`), no solo una — útil para atender varios clientes/mesas a la vez sin perder el progreso de ninguno.

**Cuenta dividida (Split bill / SubAccount)**
: Repartir el pago de una sola venta entre varias personas. Técnicamente sigue siendo **una sola `Sale`**, con varias `SubAccount` y varios `Payment` asociados — no se crean ventas separadas.

**Kardex (StockMovement)**
: Registro histórico e inmutable de cada cambio de stock de un producto (venta, cancelación, compra, merma, ajuste, importación), con el saldo resultante guardado en cada movimiento para poder auditar sin recalcular desde cero.

**Anular una venta (cancelSale)**
: Revertir una venta completada: restaura el stock vendido y marca los pagos como reembolsados. La venta **no se borra** — queda en el historial como `CANCELLED`, con quién la anuló, cuándo y por qué. Solo `SUPERVISOR` o `ADMIN`.

**Stock negativo (allowNegativeStock)**
: Flag de configuración que, si está activo, permite vender por debajo de cero unidades en existencia (útil para negocios que venden sobre pedido/producción). Desactivado por defecto — sin él, una venta que dejaría el stock negativo se rechaza.

**Endpoint pooled vs. direct (Neon)**
: Neon ofrece dos formas de conectarse: una con pooler de conexiones (host con `-pooler`, para la app en producción, que abre muchas conexiones cortas) y una directa (sin `-pooler`, para comandos administrativos puntuales como migraciones — evita el riesgo de que el pooler reutilice una sesión con estado residual de otro cliente). Ver [[08-Despliegue]].

**Server Action**
: Función de servidor de Next.js (`"use server"`) que el cliente invoca directamente como si fuera una función local. Aquí es donde vive toda la lógica de negocio — no hay una API REST/GraphQL separada. Ver [[01-Arquitectura]].

**`ActionResult<T>`**
: Tipo de retorno uniforme de toda Server Action: `{ ok: true, data }` o `{ ok: false, error }`. Los errores esperados nunca se lanzan (`throw`) porque Next.js oculta el mensaje real de una excepción en producción.

**Fuente de verdad (precios/impuestos)**
: Principio de diseño: el cliente nunca decide cuánto cuesta algo ni cuánto impuesto lleva — solo envía qué producto, cuánta cantidad, y cómo se pagó. El servidor recalcula todo desde la base de datos al momento de la venta.

**Siigo**
: Software de contabilidad/facturación colombiano del que este proyecto puede importar catálogo (y a futuro historial de ventas) para migrar un negocio existente a Oneiros POS.

## Ver también
- [[00-Índice]]
