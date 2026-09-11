---
tags: [seguridad, oneiros-pos]
---

# Seguridad

## Rate-limit de login (`lib/login-throttle.ts`)

Throttle **en memoria** (no Redis/DB) — suficiente para un despliegue de una sola instancia con pocos usuarios; si el proyecto creciera a múltiples instancias habría que migrarlo a un store compartido.

- Bloqueo por **email + IP**: 5 fallos → 15 minutos de bloqueo.
- Bloqueo **a nivel de cuenta completa** (sin importar IP): 20 fallos → mismo bloqueo. Existe porque `X-Forwarded-For` es falsificable — sin este segundo límite, alguien podría rotar de IP para seguir intentando contra la misma cuenta indefinidamente.
- Ventana deslizante de 15 minutos (`WINDOW_MS`): fallos viejos fuera de ventana no cuentan.
- Memoria acotada a 5000 entradas (`MAX_ENTRIES`), con eviction de las más antiguas ya expiradas primero.
- `recordSuccess()` limpia el contador al loguearse bien.

Usado desde el `CredentialsProvider` de NextAuth antes de verificar la contraseña — ver [[03-Autenticación-y-roles]].

## Invalidación de sesión por cambio de contraseña

`User.passwordChangedAt` + el callback `jwt` de NextAuth: cualquier JWT emitido *antes* de ese timestamp se marca `invalid` en el siguiente refresco. Efecto práctico: cambiar la contraseña de un usuario (desde `ChangePasswordModal.tsx`, o un admin editando a otro usuario) cierra sus sesiones activas en otros dispositivos sin esperar que el token expire por tiempo.

## Cambio de contraseña propio (`app/components/ChangePasswordModal.tsx`)

Modal compartido entre POS y Admin (accesible desde `POSUserMenu` y el menú de usuario del admin). Cualquier usuario autenticado puede cambiar la suya (`requireSession()`, sin rol mínimo) — un admin cambiando la de otro usuario es una operación distinta, vía `app/actions/users.ts`, que sí requiere `requireAdmin()`.

## Manejo de errores no capturados (`error.tsx` por ruta)

Next.js App Router usa `error.tsx` como error boundary de cada segmento. El proyecto tiene tres, cada uno con su propio tono:

| Archivo | Alcance | Mensaje clave |
|---|---|---|
| `app/error.tsx` | Toda la app (fallback global, incluye `<html>/<body>` propios) | Genérico: "recarga la página" |
| `app/admin/error.tsx` | Cualquier página de `/admin` | Ofrece "Reintentar" y "Ir al inicio" (`/admin`) |
| `app/pos/error.tsx` | La caja | Tranquiliza explícitamente: **"No se perdió nada: las ventas ya registradas están guardadas y el carrito se conserva en este dispositivo"** — importante en un POS, donde un error visual no debe sembrar duda sobre si una venta se perdió |

Todos loguean a consola con un prefijo (`[GlobalError]`, `[AdminError]`, `[POSError]`) y muestran `error.digest` si Next.js lo generó, para poder correlacionar con logs de servidor sin exponer el stack trace completo al usuario final.

## Otras prácticas ya aplicadas

- Contraseñas con `bcryptjs` (factor de costo 12 en seed/reset-blank).
- Ningún secreto en el repositorio: `.env*` está en `.gitignore` salvo `.env.example` (que no lleva valores reales). Ver [[14-Configuración-y-variables-de-entorno]].
- `businessLogoUrl` validado para forzar `https://` (evita mixed content e inyección de rutas locales).
- El servidor nunca confía en precios/cantidades enviados por el cliente — ver [[04-Reglas-de-negocio]].

## Pendiente (identificado, no implementado)

- Monitoreo de errores en producción (Sentry u otro) — ver [[15-Roadmap-y-limitaciones]].
- El rate-limit de login no sobrevive un redeploy/reinicio de la instancia (está en memoria) — aceptable hoy por el tamaño del despliegue, pero a vigilar si crece.

## Ver también
- [[03-Autenticación-y-roles]]
- [[15-Roadmap-y-limitaciones]]
