# Plan de Implementación: POS Mobile-First

## [Goal Description]
El objetivo es "clonar" la funcionalidad central del sistema **Siigo POS** (Back-office administrativo y Front-office de ventas) usando un diseño propio y moderno. La interfaz debe estar estrictamente optimizada para dispositivos móviles (Mobile-First) con interfaces rápidas y táctiles.

El Stack técnico a utilizar será:
- **Framework:** Next.js (App Router) actuando como Backend (Server Actions / API) y Frontend.
- **Base de Datos:** PostgreSQL en **Neon**.
- **ORM:** Prisma (recomendado por el soporte de tipado y migraciones).
- **Estándar Visual:** **Vanilla CSS** con paletas de colores ricas y modernas (Dark mode, glassmorphism, micro-animaciones). **No se utilizará TailwindCSS** según las directrices estéticas.
- **Despliegue:** Vercel.

## Proposed Changes

### 1. Setup y Arquitectura Core
El sistema estará contenido en un entorno Monorepo gracias a Next.js.
- Inicialización del proyecto web Next.js (`create-next-app`).
- Configuración de la conexión con Neon en `.env`.
- Inicialización de Prisma y diseño del Schema (Modelos de Usuario, Caja, Turno, Producto, Venta, DetalleVenta, Cliente).

### 2. Capa Front-end (Next.js App Router)
Se crearán dos ecosistemas principales dentro de `app/`:
- **`/admin` (Back-office):** Dashboard para gestión de productos, sucursales, cajas, inventario y reglas de negocio (ej. permitir stock negativo).
- **`/pos` (Front-office):** La interfaz táctil principal.
  - Componente `AuthGuard`: Exigir login.
  - Componente `ShiftGuard` (Turnos): Interceptar el acceso al catálogo si no hay un turno abierto con "base" inicial.
  - Vistas: Grid de productos (con optimización de imágenes), panel de categorías "Swipeable", Componente global de Carrito (Panel lateral), Modal de Checkout/Pagos multicaja.

### 3. Capa Estética (CSS Dinámico)
- Creación de un `globals.css` base con tokens CSS (Variables para modo claro/oscuro, gradientes suaves, sombras).
- Implementación de animaciones al agregar al carrito (feedback visual).
- Componentes modulares y reutilizables exportando `.module.css` para Scope.

### 4. Capa Backend y Base de Datos (Server Actions)
- `actions/product.ts`: Búsqueda y listado paginado.
- `actions/shift.ts`: Abrir, consultar y cerrar turnos.
- `actions/sale.ts`: Creación de la transacción. Debe realizarse en una **transacción de DB** que verifique el stock (si el stock negativo no está permitido), reste el inventario y cree el registro de venta unificado.

### 5. Epic 2: Catálogo de Productos y Carrito Táctil
El objetivo es permitir al cajero seleccionar productos de forma visual y rápida.
- **Estado Global (Zustand):** Implementar `useCartStore` para manejar múltiples órdenes abiertas simultáneamente. Se utilizará el middleware `persist` de Zustand para guardar el estado en `localStorage`, garantizando que no se pierda información al cerrar el navegador.
- **Estructura de Datos del Carrito:** `orders: { [orderId: string]: { items: CartItem[], customerId?: string } }`.
- **Capa de Datos:**
  - `actions/category.ts`: Obtener categorías para la barra superior.
  - `actions/product.ts`: Obtener productos filtrados por categoría o búsqueda.
- **Componentes UI (app/pos/components/):**
  - `CategorySelector.tsx`: Barra horizontal de categorías (Snap scrolling).
  - `ProductGrid.tsx`: Visualización de productos en rejilla responsiva.
  - `ProductCard.tsx`: Botón táctil con imagen, nombre y precio.
  - `CartDrawer.tsx`: Panel lateral con el resumen de la venta y controles de cantidad.
  - `OrderSwitcher.tsx`: Componente para alternar entre múltiples pedidos abiertos (Mesas/Clientes simultáneos).

## Verification Plan

### Automated Tests
- **Unit Testing (Mandatorio):** Se utilizará **Vitest** para probar la lógica de negocio en Server Actions y utilitarios. Todas las acciones críticas (ventas, stock, turnos) deben tener cobertura de pruebas unitarias.
- **Integridad de Datos:** Se escribirá un script de nodo aislado para probar la concurrencia: que dos `actions/sale.ts` paralelas no puedan vender el mismo ítem si solo queda 1 en inventario.

### Manual Verification
1. **Prueba Mobile View:** Se ejecutará `npm run dev` y se probará todo el Front-office `/pos` usando las DevTools en modo iPhone/iPad para certificar fluidez táctil y distribución Mobile-First.
2. **Ciclo de Vida del Turno:** Se entrará con un cajero, se intentará vender (deberá bloquearse). Se abrirá el turno con $100.000. Se realizarán transacciones. Se cerrará el turno y verificará el arqueo de caja.
3. **Control de Inventario:** Desde `/admin`, activar y desactivar la opción de "Stock Negativo" y ver reflejado cómo el `/pos` bloquea la adición al carrito si llega a 0.
