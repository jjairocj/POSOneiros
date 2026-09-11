---
tags: [referencia, oneiros-pos]
---

# Estructura de carpetas

```
app/
├── actions/            Server Actions — TODA la lógica de negocio
│   ├── sale.ts          procesar/anular ventas ([[04-Reglas-de-negocio]])
│   ├── product.ts       CRUD de productos, stock, Kardex manual
│   ├── category.ts      CRUD de categorías
│   ├── shift.ts         abrir/cerrar turno
│   ├── settings.ts       configuración del negocio
│   ├── users.ts          CRUD de personal (sin tests aún)
│   ├── registers.ts      CRUD de cajas (sin tests aún)
│   ├── customers.ts       CRUD de clientes
│   ├── dashboard.ts        métricas del resumen (sin tests aún)
│   ├── report.ts            reportes de ventas (sin tests aún)
│   └── import-products.ts   importador Siigo (sin tests aún)
│
├── admin/               Back-office — ver [[06-Componentes-Admin]]
│   ├── layout.tsx        verificación de sesión fresca, admite ADMIN+SUPERVISOR
│   ├── page.tsx           dashboard ejecutivo
│   ├── inventory/         catálogo, stock, importador Siigo
│   ├── sales/             historial y reportes de ventas
│   ├── users/             personal y cajas (solo ADMIN)
│   └── settings/          configuración de negocio (solo ADMIN)
│
├── pos/                 Punto de venta — ver [[05-Componentes-POS]]
│   ├── page.tsx           layout principal (grid catálogo + carrito)
│   └── components/
│       ├── Catalog/        ProductGrid, ProductCard, CartDrawer, OrderSwitcher
│       ├── Checkout/        CheckoutModal, SplitBillModal, Receipt
│       └── Shift/            apertura/cierre de caja
│
├── api/
│   ├── auth/[...nextauth]/ configuración de NextAuth ([[03-Autenticación-y-roles]])
│   └── export/[kind]/       CSV: sales, sales-detail, inventory, shift
│
├── store/               Zustand — ver [[07-Estado-cliente]]
│   ├── useCartStore.ts    carrito multi-orden + totales
│   └── useSubAccountStore.ts  cuenta dividida
│
├── lib/                 Utilidades de dominio compartidas cliente/servidor
│   ├── tax.ts             cálculo de impuestos/descuentos (usado por store Y por sale.ts)
│   ├── time.ts             fechas en America/Bogota (el servidor puede correr en UTC)
│   ├── money.ts            formateo de pesos colombianos
│   ├── csv.ts              generación de CSV con BOM/separador para Excel
│   └── siigo-parser.ts      parseo de exports de Siigo
│
├── types/cart.ts        tipos compartidos del carrito (CartItem, Order, OrderDiscount...)
├── components/          componentes compartidos fuera de pos/admin (AppShell, modales comunes)
├── login/page.tsx        pantalla de login
├── layout.tsx            layout raíz — metadata.robots, providers
└── robots.ts              robots.txt (Disallow: / — ver [[08-Despliegue]])

lib/                     Utilidades a nivel de aplicación (NO de dominio de negocio)
├── auth.ts                requireSession/requireAdmin/requireManager — [[03-Autenticación-y-roles]]
├── result.ts               ActionResult, UserError, toUserMessage
├── prisma.ts                cliente de Prisma (adapter-pg + pg.Pool)
└── login-throttle.ts         rate-limit de intentos de login

prisma/
├── schema.prisma          esquema completo — [[02-Modelo-de-datos]]
├── migrations/             8 migraciones aplicadas
├── seed.ts                 carga inicial (roles, sucursal, caja, admin)
└── reset-blank.ts          dejar la base en blanco para un cliente nuevo — [[09-Scripts-de-mantenimiento]]

__tests__/                Vitest — ver [[10-Testing]]
proxy.ts                  filtro barato de auth (antes middleware.ts) — [[01-Arquitectura]]
next.config.ts             headers (X-Robots-Tag), remotePatterns de imágenes
vitest.config.ts            config de tests + cobertura
```

## Ver también
- [[00-Índice]]
