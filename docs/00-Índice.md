---
tags: [moc, oneiros-pos]
---

# Oneiros POS — Documentación

Mapa de contenido (MOC) para Obsidian. Abre esta carpeta (`docs/`) como vault, o como carpeta dentro de tu vault existente — todos los enlaces son relativos por nombre de nota.

## Ingeniería

- [[01-Arquitectura]] — visión general del sistema, stack, flujo de datos
- [[02-Modelo-de-datos]] — esquema de Prisma, entidades y relaciones
- [[03-Autenticación-y-roles]] — NextAuth, sesiones, RBAC de 3 niveles
- [[04-Reglas-de-negocio]] — ventas, stock, turnos, cuenta dividida, anulaciones

## Componentes y UI

- [[05-Componentes-POS]] — caja: catálogo, carrito, checkout, turnos
- [[06-Componentes-Admin]] — back-office: inventario, ventas, usuarios, ajustes
- [[07-Estado-cliente]] — Zustand stores (carrito, sub-cuentas)

## Operación

- [[08-Despliegue]] — Vercel + Neon, variables de entorno, dominios
- [[09-Scripts-de-mantenimiento]] — seed, reset en blanco, exports
- [[10-Testing]] — Vitest, cobertura, qué falta

## Referencia rápida

- [[11-Estructura-de-carpetas]] — mapa de directorios con qué vive dónde
- [[12-Glosario]] — términos del dominio (turno, caja, sub-cuenta, Kardex...)
- [[13-Seguridad]] — rate-limit de login, invalidación de sesión, manejo de errores
- [[14-Configuración-y-variables-de-entorno]] — todas las env vars y `SystemConfig`
- [[15-Sistema-de-diseño]] — mobile-first, glassmorphism, reflexión sobre Liquid Glass de Apple
- [[16-Roadmap-y-limitaciones]] — lo identificado y no priorizado aún

---
*Generado a partir del estado del repo el 2026-09-10. Las notas describen el código tal como está; si algo cambia, actualiza la nota correspondiente en vez de crear una nueva versión.*
