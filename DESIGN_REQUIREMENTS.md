# OneirosPOS — Requerimientos de Diseño y Pruebas
### Marco conceptual: *El Diseño como Storytelling* — Ellen Lupton

---

## Premisa narrativa

> "El diseño hace que ocurran cosas. Puede ser un nombre o un verbo: *diseñar*. La palabra acción está en el centro de *interacción*."
> — Ellen Lupton, Acto 1

El sistema actual de OneirosPOS funciona. Pero funcionar no es suficiente. Lupton distingue entre el modelo **McDonald's** (funcional, predecible, emocionalmente plano) y el modelo **Chipotle** (proceso transparente, participación activa, satisfacción narrativa). Hoy OneirosPOS es McDonald's. El objetivo es convertirlo en Chipotle.

El **cajero** es el héroe. Su turno de trabajo es el viaje del héroe: tiene un principio (apertura de turno), un nudo (la presión del servicio) y un desenlace (cierre con resumen). Cada pantalla del POS es una escena de esa historia. Cada micro-interacción es una línea de diálogo.

---

## Los tres personajes (arquetipos de usuario)

| Personaje | Contexto | Dolor actual |
|-----------|----------|--------------|
| **El Cajero** | En el counter, celular o tablet en mano, clientes frente a él | Pantalla densa, sin feedback emocional, no sabe si va bien o mal en su turno |
| **El Admin** | En la trastienda o en casa, analiza ventas | Dashboard vacío (`$---`), sin narrativa del día, datos que no cuentan una historia |
| **El Dueño** | Revisa el negocio desde el móvil | Sin resumen ejecutivo real, sin alertas accionables |

---

## ACTO 1 — ACCIÓN: Rediseñar el arco narrativo de cada flujo

### 1.1 El Viaje del Héroe — Cajero (POS)

El cajero vive tres momentos en cada turno. Cada uno necesita diseño específico:

**EXPOSICIÓN → Apertura de turno**
- [ ] La pantalla de inicio (`/`) debe redirigir inteligentemente: si hay sesión activa y turno abierto → `/pos`; si es admin → `/admin`; si no hay sesión → `/login`
- [ ] La página `/login` necesita una bienvenida con nombre del negocio y fecha, no solo un formulario frío
- [ ] El modal de apertura de turno debe mostrar el historial del turno anterior ("Ayer cerraste con $X") como contexto motivacional

**NUDO → La venta (flujo crítico)**
- [ ] Cada venta completada debe tener un momento de **climax visual**: animación breve de confirmación (escala + color) antes de limpiar el carrito. No solo desaparecer.
- [ ] El carrito debe mostrar un **indicador de progreso del turno**: número de ventas realizadas en el turno actual (visible en ShiftHeader)
- [ ] La búsqueda de productos debe funcionar con **3 o menos toques** para llegar a cualquier producto (regla de tres de Lupton)

**DESENLACE → Cierre de turno**
- [ ] El modal de cierre de turno debe ser un **resumen narrativo**, no solo campos de dinero:
  - Total de transacciones
  - Producto más vendido
  - Hora pico del turno
  - Mensaje de cierre ("Buen turno, [Nombre]")

### 1.2 Storyboard de pantallas — flujo completo del cajero

```
[Login] → [POS: turno cerrado] → [Modal apertura turno]
    → [POS: catálogo activo] → [Selección producto]
    → [Carrito con items] → [Modal checkout]
    → [Selección método pago] → [Confirmación venta ✓]
    → [Recibo / siguiente venta]
    → [Modal cierre turno] → [Resumen del turno]
```

Cada transición entre pantallas debe tener propósito narrativo. Sin saltos abruptos.

### 1.3 Regla de tres — arquitectura de opciones

Aplicar en todos los puntos de decisión críticos:

| Momento | Máximo de opciones visibles |
|---------|---------------------------|
| Métodos de pago en checkout | 3 (Efectivo / Tarjeta / Transferencia) |
| Categorías visibles sin scroll | 3–5 |
| Acciones en ProductCard | 1 (Agregar) — la única acción obvia |
| Opciones en ShiftHeader | 3 (Cambiar orden / Ver carrito / Cerrar turno) |

---

## ACTO 2 — EMOCIÓN: El viaje emocional del cajero y el admin

### 2.1 Las tres capas de Don Norman aplicadas a OneirosPOS

**VISCERAL** (primera impresión — reacción inmediata a forma, color, textura)
- [ ] La página `/` debe tener glassmorphism oscuro coherente con el sistema. Actualmente es solo texto plano en fondo blanco. Es el primer frame del storyboard — necesita set the scene.
- [ ] Los colores del sistema deben comunicar estados emocionales:
  - Verde/éxito: venta completada, turno activo
  - Ámbar/atención: stock bajo, turno por cerrar
  - Rojo/urgencia: turno no abierto, error crítico
- [ ] Los ProductCard deben tener micro-interacción de hover/tap (scale 1.02, sombra suave) que los haga sentir físicos, táctiles

**CONDUCTUAL** (respuesta física a la acción — el uso fluido)
- [ ] Cada acción destructiva (eliminar producto del carrito, cancelar venta) debe pedir confirmación con una micro-pausa — no ejecutarse al primer toque
- [ ] El checkout debe tener **feedback de teclado numérico propio** para ingresar monto en efectivo, sin depender del teclado del sistema
- [ ] Al agregar un producto al carrito, el ícono del carrito debe tener una animación de "rebote" (bounce) indicando que recibió el ítem

**REFLEXIVO** (recuerdos y asociaciones — lo que el usuario lleva consigo)
- [ ] El resumen de cierre de turno debe ser **guardable/imprimible** como comprobante del cajero
- [ ] El admin debe ver en el dashboard un **"día más activo de la semana"** como referencia histórica
- [ ] Los recibos deben incluir el nombre del cajero que atendió (genera identidad y responsabilidad)

### 2.2 Viaje emocional mapeado — Cajero en hora pico

```
Estado emocional (eje Y: positivo ↑ / negativo ↓) vs Tiempo del turno (eje X)

ÉXTASIS  ↑  ────────────────────────────────────────────
             [apertura]    [venta rápida exitosa]    [cierre con buen resumen]
NEUTRAL  ─   ──────┬──────────────┬────────────────────┬──
                   ↓              ↓                    ↓
FRUSTRACIÓN ↓   [no sabe    [producto no    [modal de cierre
                  si turno    aparece en      pide datos que
                  abierto]    búsqueda]       no recuerda]
```

**Puntos de fricción actuales a eliminar:**
- [ ] Sin indicador visible de si el turno está abierto o cerrado en la vista principal del POS
- [ ] Búsqueda de productos sin debounce visible (el cajero no sabe si está buscando)
- [ ] Modal de checkout no recuerda el monto exacto si se cierra accidentalmente

**Picos de éxtasis a amplificar:**
- [ ] Venta completada → sonido suave de confirmación (opcional, configurable en Settings)
- [ ] Primera venta del turno → mensaje especial "¡Primer venta del día!"
- [ ] Meta de ventas superada (configurable) → notificación motivacional

---

## ACTO 3 — SENSACIÓN: Percepción, Gestalt y Affordance

### 3.1 La mirada — jerarquía visual

La mirada del cajero debe fluir en este orden en la pantalla del POS:

```
1. [Turno activo + usuario] — ShiftHeader (arriba)
2. [Categorías] — selección rápida (izquierda o top)
3. [Productos] — grid principal (centro)
4. [Carrito] — estado de la orden (derecha o bottom sheet)
5. [Checkout] — acción final (botón prominente)
```

Actualmente el ShiftHeader compite visualmente con el catálogo. Necesitan jerarquía clara.

### 3.2 Affordance — los objetos deben comunicar cómo usarse

- [ ] Los ProductCard deben verse **claramente presionables**: sombra, borde, área de toque grande
- [ ] El botón de checkout debe ser el elemento **más grande y contrastante** de la pantalla cuando hay items en el carrito
- [ ] Las categorías sin productos disponibles deben verse **deshabilitadas** (opacity reducida), no iguales a las activas
- [ ] El campo de búsqueda necesita un ícono de lupa **visible y grande** — no un placeholder gris que desaparece

### 3.3 Principios Gestalt aplicados

| Principio | Aplicación en OneirosPOS |
|-----------|--------------------------|
| **Proximidad** | Precio y nombre del producto deben estar juntos; acciones del producto separadas visualmente |
| **Similitud** | Todos los cards de acción (productos, categorías) deben compartir forma y radio de borde |
| **Continuidad** | El flujo carrito → checkout → confirmación debe ser una línea visual continua |
| **Cierre** | El resumen del turno debe tener un cierre visual claro (no terminar en un formulario) |
| **Figura/fondo** | El modal de checkout debe oscurecer el fondo sin ocultarlo completamente (glassmorphism) |

---

## Módulos pendientes — Requerimientos específicos

### Dashboard Ejecutivo (`/admin`)

El dashboard actual muestra `$---`. No cuenta ninguna historia. Aplicando la **economía de la experiencia** de Lupton (lo memorable supera a lo funcional):

**Widgets requeridos con datos reales:**
- [ ] **Ventas de hoy** — total en pesos, comparado con ayer (↑ o ↓ con porcentaje)
- [ ] **Transacciones** — número de ventas del día, hora más activa
- [ ] **Producto estrella** — el más vendido hoy con imagen
- [ ] **Alerta de stock** — productos bajo umbral (lista accionable, no solo número)
- [ ] **Resumen de turnos** — quién trabajó hoy, cuánto tiempo, cuánto vendió

**Narrativa del dashboard:** El admin debe poder leer el estado del negocio en **10 segundos**. Si necesita más de 10 segundos para entender qué pasó hoy, el dashboard falló.

### Gestión de Usuarios (`/admin/users`)

- [ ] Tabla de usuarios con columnas: Nombre, Rol, Caja asignada, Último turno, Estado
- [ ] Formulario de creación/edición de usuario (nombre, email, contraseña, rol, sucursal)
- [ ] Asignación de caja registradora a usuario
- [ ] Toggle de activar/desactivar usuario sin eliminarlo
- [ ] Vista de turnos recientes por usuario

### Ajustes del Sistema (`/admin/settings`)

Organizar en tres secciones (regla de tres):

**Operación**
- [ ] Toggle: Permitir ventas con stock en cero
- [ ] Toggle: Sonido en confirmación de venta
- [ ] Campo: Meta diaria de ventas (para notificación motivacional al cajero)

**Impuestos**
- [ ] IVA base por defecto (configurable por producto, pero con default)
- [ ] Toggle: Mostrar desglose de impuestos en recibo

**Negocio**
- [ ] Nombre del negocio (aparece en recibos y pantalla de login)
- [ ] Logo del negocio (upload)
- [ ] Dirección (aparece en recibos)
- [ ] NIT/RUT

### Gestión de Clientes (módulo nuevo)

- [ ] Búsqueda de cliente por documento o nombre **desde el POS** (en el checkout, antes de procesar pago)
- [ ] Crear cliente nuevo desde el checkout sin abandonar la venta
- [ ] En Admin: tabla de clientes con historial de compras y total gastado

---

## Plan de pruebas — Criterios de aceptación por escena

### Prueba 1: Flujo cajero completo (happy path)
```
Precondición: Usuario cajero, sin turno activo

1. Login → debe llegar a /pos automáticamente
2. El sistema detecta que no hay turno abierto → muestra modal de apertura
3. Cajero abre turno con $100.000 base
4. Busca producto por nombre → aparece en < 500ms
5. Agrega 3 productos al carrito
6. Toca "Cobrar" → aparece modal de checkout con total correcto
7. Selecciona "Efectivo", ingresa monto mayor al total
8. Sistema calcula cambio y muestra confirmación
9. Venta aparece en el recibo y en historial de ventas
10. ShiftHeader muestra "1 venta" en el contador del turno
```

### Prueba 2: Flujo cajero — hora pico (stress test)
```
1. Con 3 órdenes abiertas simultáneamente (OrderSwitcher)
2. Cajero puede cambiar entre órdenes sin perder datos
3. Cada orden mantiene su estado independiente
4. Checkout de orden 2 no afecta orden 1 ni orden 3
```

### Prueba 3: Cierre de turno con resumen
```
1. Cajero abre cierre de turno
2. Sistema muestra: total ventas, número de transacciones, producto más vendido
3. Cajero ingresa monto de cierre de caja
4. Sistema calcula diferencia vs. esperado
5. Turno queda CLOSED en la base de datos
6. Admin puede ver el turno cerrado en el historial
```

### Prueba 4: Admin — Dashboard con datos reales
```
1. Existen ventas del día en la base de datos
2. Dashboard muestra cifras reales (no $---)
3. Las cifras coinciden con el historial de ventas
4. Filtro de fecha funciona (hoy / esta semana / este mes)
```

### Prueba 5: Accesibilidad táctil (mobile-first)
```
1. Todos los botones tienen área táctil mínima de 44x44px
2. El POS funciona completo en pantalla de 390px de ancho
3. El teclado del sistema no oculta el botón de "Cobrar"
4. No hay scroll horizontal en ninguna pantalla del POS
```

### Prueba 6: Feedback visual en estados
```
1. Producto sin stock → badge visible "Agotado", no se puede agregar
2. Turno no abierto → CTA prominente "Abrir turno" en lugar del catálogo
3. Carga de productos → skeleton loaders (no pantalla en blanco)
4. Error de red → mensaje amigable con opción de reintentar
```

---

## Checklist de diseño — Lista de comprobación de Lupton

Antes de considerar cualquier pantalla completa, verificar:

- [ ] ¿Esta pantalla ilustra bien una acción? ¿Tiene verbo?
- [ ] ¿Incluye una llamada a la acción clara?
- [ ] ¿El viaje emocional del usuario en esta pantalla tiene subida y bajada, no es plano?
- [ ] ¿Los elementos visuales tienen affordance real (parecen presionables, deslizables, accionables)?
- [ ] ¿Funciona en 390px de ancho sin pérdida de funcionalidad?
- [ ] ¿El usuario sabe en 3 segundos dónde está y qué puede hacer?
- [ ] ¿Los colores comunican estado (no solo decoración)?
- [ ] ¿Hay un momento de cierre/resolución o la pantalla termina en el aire?

---

## Orden de implementación recomendado

```
Sprint 1.5 — Auditoría de diseño (hallazgos de revisión en browser)
│
│  Problema 1 — CRÍTICO: Layout del POS envuelto en sidebar de admin
│  El sidebar de navegación admin (Inventario / Ventas / Cajeros / Ajustes)
│  aparecía en la pantalla del cajero, rompiendo el flujo narrativo y
│  exponiendo rutas de admin a roles no autorizados visualmente.
│  → Fix: AppShell excluye /pos del Navbar y el padding lateral.
│  → Fix: Nuevo app/pos/layout.tsx aplica clase `dark` aislada al POS.
│
│  Problema 2 — CRÍTICO: Paleta de colores completamente plana (todo blanco)
│  El spec pide glassmorphism oscuro, deep gradients y dark mode como base
│  visual. La app mostraba fondos #fff sin ninguna profundidad.
│  → Fix: POSLayout envuelve el POS en modo oscuro activando variables .dark.
│
│  Problema 3 — MEDIA: ProductCard sin affordance visual
│  Las tarjetas no comunicaban que son presionables. Sin escala en hover,
│  sin sombra de profundidad, sin feedback táctil.
│  → Fix: hover:scale-[1.02] + hover:-translate-y-1 + sombra primaria en Card.
│
│  Problema 4 — MEDIA: Estado vacío del carrito emocionalmente plano
│  "Bandeja vacía" + ícono gris no invitaba a ninguna acción ni narración.
│  → Fix: Copy accionable + indicador visual hacia el catálogo.
│
│  Problema 5 — BAJA: Header móvil (390px) partía título en dos líneas
│  "Oneiros POS" + badge + botón no cabían en una línea en móvil.
│  → Fix: h1 oculto en mobile, badge reducido, layout responsivo en ShiftHeader.
│
│  Problema 6 — BAJA: Botón "PROCEDER AL PAGO" sin contraste cuando activo
│  El botón no mostraba suficiente presencia visual con ítems en carrito.
│  → Fix: Sombra primaria animada + glow en estado habilitado.

Sprint 1 — Completar el arco narrativo del cajero
├── Home page / → redirección inteligente
├── ShiftHeader → mostrar contador de ventas del turno
├── Feedback visual de venta completada (animación)
└── Resumen de cierre de turno con datos reales

Sprint 2 — Admin funcional
├── Dashboard ejecutivo con datos reales
├── Gestión de usuarios y cajas (CRUD completo)
└── Ajustes del sistema (Settings funcionales)

Sprint 3 — Experiencia emocional
├── Micro-interacciones en ProductCard y carrito
├── Búsqueda de cliente en checkout
├── Alertas de stock bajo en admin
└── Sonido configurable en confirmación de venta

Sprint 4 — Pulido y pruebas
├── Pruebas de accesibilidad táctil (targets mínimo 44px)
├── Skeleton loaders en todas las vistas con carga async
├── Estados de error con mensajes amigables (error boundaries)
└── Exportación de reportes (PDF/Excel)

Sprint 5 — Estabilización y QA visual
├── Corrección de z-index y stacking contexts (modales detrás de headers sticky)
├── Scroll del catálogo POS: buscador y categorías fijos al hacer scroll
├── Filtro "Sin Categoría" en selector de categorías del POS
├── Arqueo de cierre de turno: desglose por método de pago en resumen Z
├── Hydration warnings suprimidos (extensiones de browser en body)
└── Auditoría de modales: todos usan createPortal para escapar stacking contexts
```

---

## ACTO 4 — FUNCIONALIDADES AVANZADAS

### Sprint 6 — Cuentas separadas (Split Bill)

**Contexto narrativo**: En cafeterías, restaurantes y tiendas grupales, es común que un grupo de personas quiera dividir la cuenta. Hoy el POS solo soporta una orden por turno activa o múltiples órdenes manuales sin relación entre sí. El cajero debe dividir manualmente en papel, lo que genera errores y fricción.

**Objetivo**: Permitir que una orden se divida en subcuentas por persona o grupo, cada una cobrable de forma independiente, con su propio método de pago.

#### 6.1 Modelo de datos

```
Orden principal
  └── Subcuenta 1 (Persona A) → items seleccionados → pago independiente
  └── Subcuenta 2 (Persona B) → items seleccionados → pago independiente
  └── Subcuenta 3 (Compartido) → items divididos equitativamente → pago por splits
```

- Agregar tabla `SubAccount` en Prisma:
  ```prisma
  model SubAccount {
    id        String   @id @default(cuid())
    orderId   String
    label     String   // "Persona 1", "María", etc.
    items     Json     // snapshot de CartItem[]
    total     Decimal
    paid      Boolean  @default(false)
    saleId    String?  // referencia a Sale si ya se cobró
    createdAt DateTime @default(now())
  }
  ```
- `Sale` existente se reutiliza: cada subcuenta genera su propio `Sale` con su método de pago

#### 6.2 Flujo de usuario (cajero)

**Paso 1 — Activar modo split desde el carrito**
- Botón "Dividir cuenta" en el footer del `CartDrawer`, visible solo cuando hay ≥ 2 items
- Al activar, aparece el `SplitBillModal`

**Paso 2 — Crear subcuentas**
- El modal muestra todos los items del carrito a la izquierda
- A la derecha, lista de subcuentas (inicia con 2, máximo 8)
- Botones: "+ Agregar persona", "Dividir equitativamente", "Dividir por item"
- Cada subcuenta tiene un label editable (default: "Persona 1", "Persona 2"...)

**Paso 3 — Asignar items**
- Modo drag-and-drop: arrastrar items de la lista central a cada subcuenta
- O modo selector: tap en item → tap en subcuenta destino
- Items con cantidad > 1 pueden dividirse (ej: 2 cafés → 1 a cada subcuenta)
- "Dividir equitativamente": distribuye el total en partes iguales sin asignar items específicos (útil para mesas donde todos piden similar)

**Paso 4 — Cobrar subcuentas**
- Cada subcuenta muestra su total calculado
- Botón "Cobrar" por subcuenta → abre `CheckoutModal` para esa subcuenta
- Las subcuentas cobradas se marcan con ✓ verde y quedan bloqueadas
- La orden se cierra completamente cuando todas las subcuentas están pagadas
- Subcuentas pendientes persisten: si el cajero cobra 2 de 3, la 3ra queda en estado "pendiente de pago"

**Paso 5 — Recibo por subcuenta**
- Cada subcuenta genera su propio recibo con solo sus items y su total
- El recibo indica "Subcuenta: [label] — Mesa/Orden: [id]"

#### 6.3 Casos especiales

- **Items compartidos**: un item puede marcarse como "compartido" → su precio se divide entre todas las subcuentas activas (ej: una botella de vino para la mesa)
- **Propina por subcuenta**: si se implementa propina en el futuro, aplica por subcuenta
- **Cancelar split**: si el cajero cancela, vuelve a la orden unificada sin perder items
- **Split parcial**: se puede cobrar la cuenta completa a una persona y solo dividir algunos items

#### 6.4 Componentes a crear

| Componente | Ruta | Descripción |
|---|---|---|
| `SplitBillButton` | `CartDrawer.tsx` | Botón trigger visible con ≥2 items |
| `SplitBillModal` | `Checkout/SplitBillModal.tsx` | Modal principal de división |
| `SubAccountCard` | `Checkout/SubAccountCard.tsx` | Tarjeta por persona con sus items y total |
| `ItemAssigner` | `Checkout/ItemAssigner.tsx` | Lista de items arrastrables/seleccionables |
| `useSubAccounts` | `store/useSubAccounts.ts` | Zustand store para estado de subcuentas |

#### 6.5 Server Actions a crear

- `createSubAccounts(orderId, subAccounts[])` — persiste las subcuentas
- `paySubAccount(subAccountId, paymentMethod, amount)` — cobra una subcuenta, crea Sale
- `getOrderSubAccounts(orderId)` — obtiene subcuentas con estado de pago
- `cancelSubAccounts(orderId)` — cancela split, restaura orden original

#### 6.6 Criterios de aceptación

- [ ] Una orden de 4 items puede dividirse en 2–4 subcuentas en menos de 30 segundos
- [ ] Cada subcuenta genera su propio registro `Sale` con método de pago independiente
- [ ] El cajero puede cobrar subcuentas en cualquier orden (no necesariamente secuencial)
- [ ] Si una subcuenta queda sin pagar, la orden NO se cierra y permanece visible
- [ ] El resumen del turno cuenta correctamente el total de subcuentas cobradas como transacciones separadas
- [ ] "Dividir equitativamente" funciona con montos no divisibles (redondea la diferencia a la primera subcuenta)
- [ ] En mobile (< 640px) el modal es usable con una sola mano

---

### Sprint 7 — Cobertura de tests unitarios

**Objetivo**: Garantizar que cada componente crítico del sistema tiene al menos un test unitario que verifique su comportamiento principal. El stack es **Vitest + Testing Library**.

#### 7.1 Inventario de componentes sin tests (prioridad alta)

**Store / Estado global**

| Archivo | Tests requeridos |
|---|---|
| `app/store/useCartStore.ts` | `addItem`, `removeItem`, `updateQuantity`, `clearActiveOrder`, cálculo de `subtotal/taxIva/total`, multi-orden |

**Server Actions**

| Archivo | Tests requeridos |
|---|---|
| `app/actions/product.ts` | `getProducts` con filtros (favorites, uncategorized, categoryId, search), `createProduct`, `updateProduct`, `deleteProduct` |
| `app/actions/shift.ts` | `getActiveShift`, `openShift`, `closeShift` (cálculo de summary, topProduct, peakHour, diferencia de caja) |
| `app/actions/sale.ts` | `createSale` con descuento de stock, validación de turno activo |
| `app/actions/customers.ts` | `searchCustomers` (mínimo 2 chars, max 8 resultados), `createCustomer` |
| `app/actions/dashboard.ts` | `getDashboardData` (KPIs correctos, lowStockProducts) |

**Componentes UI — POS**

| Componente | Tests requeridos |
|---|---|
| `ProductCard.tsx` | Renderiza nombre/precio, click agrega al carrito, out-of-stock deshabilita click, toggle favorito llama action |
| `CategorySelector.tsx` | Renderiza categorías, badge activo cambia con `activeCategoryId`, click llama `onSelect` |
| `CartDrawer.tsx` | Muestra items, botones +/- actualizan cantidad, "Limpiar" vacía orden, "Proceder al pago" abre checkout |
| `ProductGrid.tsx` | Carga inicial con categoría `favorites`, cambio de categoría llama `getProducts`, búsqueda con debounce |
| `OrderSwitcher.tsx` | Cambio de orden activa store, "+ Nueva" crea orden |
| `MobileCartBar.tsx` | Muestra total y count, bounce animation al agregar item |

**Componentes UI — Admin**

| Componente | Tests requeridos |
|---|---|
| `ExportButton.tsx` | Click genera archivo XLSX, columnas correctas |
| `LowStockPanel.tsx` | Renderiza productos con stock ≤ threshold, badge rojo si stock=0 |
| `product-form.tsx` | Validación de campos requeridos, submit llama action correcta (create vs update) |

**Componentes UI — Shift**

| Componente | Tests requeridos |
|---|---|
| `ShiftClosingModal.tsx` | Stage 1: submit con monto válido/inválido; Stage 2: renderiza summary con diferencia coloreada correctamente |
| `ShiftOpeningModal.tsx` | Submit llama `openShift`, cierra modal en éxito |
| `CheckoutModal.tsx` | Selección de método de pago, búsqueda de cliente, submit llama `createSale`, sonido se reproduce |

**Utilidades**

| Archivo | Tests requeridos |
|---|---|
| `app/lib/money.ts` | `formatMoney` con valores enteros, decimales, cero, negativos |
| `app/lib/sound.ts` | `playSaleSound` no lanza error en entorno sin AudioContext |
| `app/actions/product.ts` — import | `parseXLSX`, detección de duplicados por código, mapeo de columnas Siigo |

#### 7.2 Configuración de entorno de tests

- Configurar `vitest.config.ts` con `jsdom` environment
- Mock de `next/navigation` (`useRouter`, `useSearchParams`)
- Mock de `next-auth/react` (`useSession`)
- Mock de server actions con `vi.mock('@/app/actions/...')`
- Mock de `prisma` para tests de actions (usar `prisma-mock` o `jest-mock-extended`)
- Setup de `@testing-library/jest-dom` para matchers extendidos
- Script en `package.json`: `"test": "vitest"`, `"test:coverage": "vitest --coverage"`

#### 7.3 Estructura de archivos de test

```
__tests__/
  store/
    useCartStore.test.ts
  actions/
    product.test.ts
    shift.test.ts
    sale.test.ts
    customers.test.ts
    dashboard.test.ts
  components/
    pos/
      ProductCard.test.tsx
      CategorySelector.test.tsx
      CartDrawer.test.tsx
      ProductGrid.test.tsx
      MobileCartBar.test.tsx
    admin/
      ExportButton.test.tsx
      LowStockPanel.test.tsx
      ProductForm.test.tsx
    shift/
      ShiftClosingModal.test.tsx
      ShiftOpeningModal.test.tsx
      CheckoutModal.test.tsx
  lib/
    money.test.ts
    sound.test.ts
```

#### 7.4 Criterios de aceptación

- [ ] `vitest --run` pasa sin errores desde cero (sin servidor ni DB real)
- [ ] Cobertura mínima: 80% de statements en `app/store/`, 70% en `app/actions/`, 60% en `app/pos/components/`
- [ ] Tests de actions usan mocks de Prisma — no tocan la DB real
- [ ] CI-ready: los tests corren en GitHub Actions sin configuración adicional
- [ ] Cada test describe claramente QUÉ prueba (nombres descriptivos en español o inglés)

---

## Referencia técnica

- **Stack**: Next.js 16 / React 19 / Prisma 7 / PostgreSQL / Zustand / Tailwind CSS 4
- **Componentes UI**: Radix UI + módulos CSS propios (glassmorphism)
- **Estado global**: Zustand (`useCartStore`) — multi-orden
- **Server Actions**: `/app/actions/` — usar para todos los nuevos endpoints
- **Estilos**: Mobile-first, `.module.css` para componentes específicos, variables CSS para tokens
- **Testing**: Vitest + Testing Library — agregar tests por cada flujo del plan de pruebas

---

*Documento generado para Claude Code CLI — OneirosPOS v1.x*
*Marco: Ellen Lupton, "El Diseño como Storytelling" (Cooper Hewitt, 2017)*
