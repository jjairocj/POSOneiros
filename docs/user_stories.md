# Oneiros POS - Historias de Usuario Detalladas y Escalables

Este documento detalla las Historias de Usuario (US) de alto nivel, desglosadas en Tareas y Subtareas técnicas para garantizar un sistema escalable, resiliente (Offline-first approach) y mantenible a largo plazo.

## Epic 1: Autenticación, Control de Roles y Caja (Turnos)
La gestión de turnos es obligatoria para garantizar el control del efectivo por jornada y la seguridad del sistema, permitiendo futuros escalamientos hacia auditorías y multi-sucursal.

### US1.1: Autenticación Segura y Basada en Roles (RBAC)
Como cajero/administrador, quiero iniciar sesión de forma segura para acceder al sistema según mis permisos.
- [x] **Tarea 1.1.1: Implementar sistema de Autenticación Front/Back.**
  - [x] Subtarea 1.1.1.1: Configurar NextAuth.js o Supabase Auth (según stack final, recomendamos middleware de Next.js).
  - [x] Subtarea 1.1.1.2: Diseñar pantalla de Login (Mobile-first, password visibility toggle).
- [x] **Tarea 1.1.2: Implementar Control de Acceso Basado en Roles (RBAC).**
  - [x] Subtarea 1.1.2.1: Crear modelo `Role` y `UserRole` en Prisma (Admin, Cajero, Supervisor).
  - [x] Subtarea 1.1.2.2: Proteger rutas del Front-office (`/pos`) y Back-office (`/admin`) en `middleware.ts`.

### US1.2: Apertura de Turno Dinámica
Como cajero, quiero abrir mi turno registrando la base inicial, para mantener la trazabilidad financiera del día.
- [x] **Tarea 1.2.1: Gestión del Modelo de Turnos.**
  - [x] Subtarea 1.2.1.1: Crear modelo `Shift` (Turno) en DB (UserId, CajaId, BaseAmount, StartTime, EndTime, Status).
- [x] **Tarea 1.2.2: Interfaz de Apertura de Turno.**
  - [x] Subtarea 1.2.2.1: Componente modal de ingreso de billetes/monedas (Denominaciones) para cálculo rápido de base (Escalabilidad: facilitar el arqueo).
  - [x] Subtarea 1.2.2.2: Guardar "Caja activa" en Contexto/Estado Global (Zustand/Jotai) tras apertura exitosa.

### US1.3: Cierre de Turno y Arqueo (Z-Report)
Como cajero, quiero cerrar mi turno y que el sistema genere un reporte de descuadre.
- [x] **Tarea 1.3.1: Algoritmo de Consolidación de Ventas.**
  - [x] Subtarea 1.3.1.1: Server Action para sumarizar Ventas en Efectivo, Tarjeta y Transferencia del Turno actual.
- [x] **Tarea 1.3.2: Flujo de Cierre de Caja.**
  - [x] Subtarea 1.3.2.1: UI para ingreso de denominaciones de cierre (Arqueo ciego opcional para evitar fraudes).
  - [x] Subtarea 1.3.2.2: Registrar evento en audit log y marcar turno como `CLOSED`.

---

## Epic 2: Catálogo y Carrito (UX Mobile-First)
La interfaz principal (Front-office) debe ser extremadamente veloz, priorizando el uso constante y táctil (100% responsiva).

### US2.1: Catálogo de Productos Optimizado
Como cajero, quiero ver el catálogo rápidamente y poder buscar productos sin latencia notable.
- [x] **Tarea 2.1.1: API y Caché de Catálogo.**
  - [x] Subtarea 2.1.1.1: Implementar Infinite Scrolling o Paginado en Server Actions para el inventario.
  - [x] Subtarea 2.1.1.2: Implementar capa de caché (React Query o SWR) para acceso veloz.
- [x] **Tarea 2.1.2: Interfaz Táctil (Grid & Swipe).**
  - [x] Subtarea 2.1.2.1: Componente `ProductCard` táctil (Imagen optimizada `next/image`, precio, badge de stock).
  - [x] Subtarea 2.1.2.2: Implementar barra de búsqueda con *Debounce* y lectura rápida de código de barras (HID input listener).

### US2.2: Gestión de Carrito (Panel Flotante/Lateral)
Como cajero, quiero modificar el pedido del cliente ágilmente antes del pago.
- [x] **Tarea 2.2.1: Estado Global del Carrito (Zustand).**
  - [x] Subtarea 2.2.1.1: Acciones: `addItem`, `removeItem`, `updateQuantity`, `applyDiscount`.
  - [x] Subtarea 2.2.1.2: Cálculo reactivo de Subtotal, Impuestos Dinámicos (IVA configurable por producto, ICA, ImpoConsumo) y Total.
- [x] **Tarea 2.2.2: UI del Carrito.**
  - [x] Subtarea 2.2.2.1: Diseño Drawer/Sidebar animado con CSS Transitions.
  - [x] Subtarea 2.2.2.2: Seleccionador de cliente (Búsqueda rápida o "Consumidor Final" default).

### US2.3: Gestión de Múltiples Cuentas Simultáneas (Mesas/Pedidos Pendientes)
Como cajero, quiero mantener varias órdenes abiertas al mismo tiempo para atender a diferentes clientes sin perder el progreso de cada una.
- [x] **Tarea 2.3.1: Persistencia de Órdenes Suspendidas.**
  - [x] Subtarea 2.3.1.1: Modificar `useCartStore` para soportar un array de `orders` con un `activeOrderId`.
  - [x] Subtarea 2.3.1.2: Implementar función "Suspender" o "Nueva Cuenta" que guarde el estado actual y limpie el grid.
- [x] **Tarea 2.3.2: UI de Navegación entre Cuentas.**
  - [x] Subtarea 2.3.2.1: Barra de "Cuentas Abiertas" con indicadores visuales (Ej: Mesa 1, Mesa 2, Cliente 1).
  - [x] Subtarea 2.3.2.2: Acceso rápido para alternar entre pedidos y añadir ítems a cualquiera de ellos.
- [ ] **Tarea 2.3.3: Navegación del Cajero sin Turno Activo.**
  - [ ] Subtarea 2.3.3.1: Permitir al cajero navegar por el TPV, catálogos y armar órdenes sin estar bloqueado por el modal de apertura de turno. El bloqueo estricto de turno activo solo debe aplicar al intentar **Procesar Pago**.

---

## Epic 3: Proceso de Checkout y Transaccionalidad
Garantizar la integridad de los datos financieros al momento de concretar la orden.

### US3.1: Checkout Flexibles y Multi-Método
Como cajero, quiero procesar pagos combinados (Ej: Mitad efectivo, mitad transferencia) de forma segura, siempre y cuando tenga un turno de caja abierto.
- [ ] **Tarea 3.1.1: Validación de Turno y Seguridad.**
  - [ ] Subtarea 3.1.1.1: Validar (cliente y servidor) que exista un turno `OPEN` asignado antes de permitir abrir el modal de pagos o ejecutar la venta.
- [ ] **Tarea 3.1.2: UI de Pagos.**
  - [ ] Subtarea 3.1.2.1: Modal de confirmación de pago con calculador de cambio (Efectivo).
  - [ ] Subtarea 3.1.2.2: Soporte explícito e interfaz para añadir múltiples métodos de pago a una misma transacción: **Efectivo**, **Pagos con Tarjetas (Datafono)**, y **Transferencias**.
- [ ] **Tarea 3.1.2: Transacción de Base de Datos (ACID).**
  - [ ] Subtarea 3.1.2.1: Escribir Server Action `processSale` usando Prisma Transactions.
  - [ ] Subtarea 3.1.2.2: Si hay error (ej. falta de stock de último minuto), hacer *rollback* completo y notificar a UI.

### US3.2: Generación y Entrega de Comprobante
Como cliente, quiero mi comprobante de compra digital o físico.
- [ ] **Tarea 3.2.1: Generación de Ticket.**
  - [ ] Subtarea 3.2.1.1: Diseñar plantilla HTML/CSS para ticket (80mm/58mm standard ESC/POS friendly).
  - [ ] Subtarea 3.2.1.2: Lógica para disparar `window.print()` oculto u ofrecer descarga de PDF.

---

## Epic 4: Back-office e Inventarios (Core Administrativo)
El cerebro detrás de las operaciones, enfocado en manejo multi-sucursal y control de stock.

### US4.1: Topología de Negocio (Sucursales y Cajas)
Como administrador, quiero crear múltiples puntos de venta físicos y lógicos.
- [ ] **Tarea 4.1.1: Modelado de Topología.**
  - [x] Subtarea 4.1.1.1: Modelos `Branch` (Sucursal) y `Register` (Caja) vinculados a la sucursal. Asignación de series de facturación por caja.
- [ ] **Tarea 4.1.2: CRUD Topología.**
  - [ ] Subtarea 4.1.2.1: Formularios en `/admin` para dar de alta/baja sucursales y cajas.

### US4.2: Gestión de Inventarios y Reglas de Negocio
Como administrador, quiero controlar el stock y decidir si permito ventas en negativo (Preventas/Errores de bodega).
- [ ] **Tarea 4.2.1: CRUD de Productos Avanzado.**
  - [ ] Subtarea 4.2.1.1: Formulario con soporte para variantes (ej. Tallas/Colores) [Escalabilidad a futuro] y control de Costo vs Precio de Venta.
- [ ] **Tarea 4.2.2: Flujo Kardex (Movimientos de Inventario).**
  - [x] Subtarea 4.2.2.1: Todo descuento/aumento de stock debe generar un registro auditable (`InventoryMovement` model).
- [ ] **Tarea 4.2.3: Configuraciones Globales (App Settings).**
  - [x] Subtarea 4.2.3.1: Tabla `SystemConfig` (Key-Value) para *feature flags* (Ej: `ALLOW_NEGATIVE_STOCK = true`).

---

## Consideraciones de Escalabilidad Arquitectónica:
- **Offline-First Resilience**: Las llamadas a API deben estar diseñadas para que, en un futuro cercano, Service Workers puedan encolar (queue) las ventas (`processSale`) si hay un corte de red mediante IndexedDB (PWA).
- **Multi-Tenant (SaaS Ready)**: El esquema de base de datos tendrá la columna `TenantId` o un esquema por cliente en caso de que la app pivote y se venda como un producto B2B, no solo uso interno.
- **Componentes Atómicos**: Uso de Radix Primitives o Shadcn (base estructural pero sin Tailwind) + CSS Modules para garantizar que no haya colisiones de clases en proyectos que crecen exponencialmente.
