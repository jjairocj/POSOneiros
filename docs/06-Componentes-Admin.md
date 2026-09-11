---
tags: [componentes, admin, oneiros-pos]
---

# Componentes — Back-office (`app/admin/`)

`app/admin/layout.tsx` hace su propio `getServerSession()` fresco y admite `ADMIN` + `SUPERVISOR` (ver [[03-Autenticación-y-roles]]). Navegación lateral (`AdminSidebar.tsx` desktop, `AdminMobileNav.tsx` mobile) filtra sus ítems según `role`, con un flag `adminOnly` por entrada.

## Resumen (`app/admin/page.tsx`)

Dashboard ejecutivo: ventas de hoy, transacciones, turno activo, productos con bajo stock, gráfico de ventas por hora (`SalesHourChart.tsx`, Recharts), top 5 productos y últimas ventas. Datos de `app/actions/dashboard.ts`.

## Inventario (`app/admin/inventory/`)

- **`page.tsx`** — tabla de productos (`data-table.tsx`, genérico con `@tanstack/react-table`) + panel de bajo stock (`LowStockPanel.tsx`) + drag-and-drop de categorías (`CategoryDragList.tsx`, `@dnd-kit`). El enlace al importador Siigo solo aparece para `ADMIN`.
- **`components/product-form.tsx`** — alta/edición de producto. Incluye preview en vivo de `imageUrl` con manejo de error igual al patrón de `ProductCard` (ver [[05-Componentes-POS]]).
- **`components/StockMovementModal.tsx`** — entrada manual al Kardex (compra/merma/ajuste). Se mantiene montado fuera del menú desplegable de la fila de la tabla a propósito — si viviera dentro del `DropdownMenu`, Radix lo desmonta al cerrar el menú antes de que el modal termine de abrir.
- **`components/MovementsTable.tsx`** — pestaña "Movimientos": histórico completo del Kardex, exportable a CSV.
- **`components/RowActions.tsx`**, **`DeleteProductItem.tsx`** — acciones por fila (editar, activar/desactivar, eliminar).
- **`import/` (`ImportWizard.tsx`)** — asistente de importación de catálogo/ventas desde Siigo. Solo `ADMIN` (verificación propia en `import/page.tsx`, no confía solo en el layout).

## Ventas (`app/admin/sales/`)

- **`DashboardTab.tsx`** — métricas de ventas con filtros de fecha.
- **`HistoryTab.tsx`** — historial de ventas, tabla desktop + tarjetas en mobile. Usa un mapa `METHOD_LABEL` (`CASH → Efectivo`, `CARD → Tarjeta`, `TRANSFER → Transferencia`) para no mostrar los enums crudos al usuario.
- **`CancelSaleDialog.tsx`** — modal para anular una venta con motivo obligatorio; llama a `cancelSale()` (solo SUPERVISOR+, ver [[04-Reglas-de-negocio]]).
- **`ExportButton.tsx`** — dispara la descarga de CSV vía `app/api/export/[kind]/route.ts`.

## Usuarios y Cajas (`app/admin/users/`) — solo ADMIN

- **`UsersTable.tsx`** / **`UserFormModal.tsx`** — alta/edición de personal, asignación de rol y sucursal.
- **`RegistersTable.tsx`** / **`RegisterFormModal.tsx`** — cajas físicas (`Register`): nombre, prefijo de factura.
- **`role-labels.ts`** — `ROLE_LABEL`, `ROLE_DESCRIPTION`, `ROLE_BADGE_CLASS` para mostrar los roles en español con estilo consistente.

Nota: `data-table.tsx` es compartido entre Inventario/Usuarios/Cajas; acepta `filterPlaceholder` y `emptyMessage` opcionales para que cada tabla tenga su propio copy en vez de heredar el texto genérico de "productos".

## Ajustes (`app/admin/settings/`) — solo ADMIN

**`SettingsForm.tsx`** — formulario de configuración del negocio: nombre, NIT, dirección, `businessLogoUrl` (con preview en vivo), si mostrar el logo en el recibo, si permitir stock negativo (`allowNegativeStock`), impuestos por defecto. El botón "Guardar cambios" es sticky; su espacio de despeje se reserva con `margin-top` en la propia barra sticky (no `padding-bottom` en el formulario) — ver detalle en el commit que corrigió el solape visual.

## Ver también
- [[03-Autenticación-y-roles]]
- [[04-Reglas-de-negocio]]
- [[09-Scripts-de-mantenimiento]] (exports CSV)
