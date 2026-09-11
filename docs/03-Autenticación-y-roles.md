---
tags: [auth, seguridad, oneiros-pos]
---

# Autenticación y roles

## NextAuth (credenciales)

`app/api/auth/[...nextauth]/route.ts` configura NextAuth v4 con un `CredentialsProvider`:

- Login = correo + contraseña, hash con `bcryptjs`.
- Estrategia de sesión: **JWT**, no sesiones en base de datos.
- El callback `jwt` re-verifica `passwordChangedAt` en cada refresco de token: si la contraseña cambió después de que el token fue emitido, el token se marca inválido (`token.invalid = true`) y la sesión muere — así cambiar la contraseña de un usuario cierra sus sesiones activas en otros dispositivos sin esperar la expiración natural.

## El problema de la "doble verificación" (por qué hay dos capas)

Hay una distinción importante entre dos formas de leer la sesión:

| Dónde | Cómo | Qué tan fresco |
|---|---|---|
| `proxy.ts` | `req.nextauth.token` — decodifica el JWT de la cookie directamente | Puede estar desactualizado hasta el intervalo de refetch del `SessionProvider` en cliente |
| Páginas (`admin/layout.tsx`, `pos/page.tsx`) y toda Server Action | `getServerSession()` | Siempre fresco — vuelve a correr el callback `jwt`, incluyendo el chequeo de `passwordChangedAt` |

**`proxy.ts` es solo un filtro barato** ("¿hay alguien logueado, en general?"), nunca la autoridad final. La autoridad real de "¿esta sesión sigue siendo válida ahora mismo?" vive en cada página y cada acción. Esto se decidió así tras un bug real: si el proxy hubiera sido la única verificación, invalidar una sesión por cambio de contraseña no habría surtido efecto hasta que el JWT expirara naturalmente.

Nota histórica: `/login` deliberadamente **no** está protegido por el proxy. Si lo estuviera, combinado con la redirección de vuelta a `/login` que hacen las páginas cuando detectan una sesión inválida, se producía un loop infinito (`ERR_TOO_MANY_REDIRECTS`) durante la ventana de staleness del proxy. La conveniencia de "ya estás logueado, no te muestro el formulario" se resolvió en cliente (`app/login/page.tsx`, con `useSession()` en vivo) en vez de en el proxy.

## Modelo de roles (3 niveles, jerárquico)

Definido en `lib/auth.ts`:

```ts
export const ROLE_RANK: Record<Role, number> = { CASHIER: 0, SUPERVISOR: 1, ADMIN: 2 };
```

| Rol | Alcance |
|---|---|
| **CASHIER** (cajero) | Solo `/pos`: vender, aplicar descuentos, dividir cuenta, abrir/cerrar su propio turno, gestionar clientes, cambiar su contraseña. |
| **SUPERVISOR** (encargado) | Todo lo del cajero, más: dashboard y reportes, inventario y categorías, movimientos de stock (Kardex manual), anular una venta, actuar sobre el turno de otro cajero. **No** ve Usuarios/Cajas, Ajustes, ni el importador Siigo. |
| **ADMIN** (dueño) | Todo. Único rol que gestiona personal, cajas físicas, configuración del negocio e importaciones masivas — acciones que pueden bloquear a todos los demás o corromper el catálogo si se usan mal. |

Un rol superior pasa automáticamente cualquier verificación de un rol inferior (`roleAtLeast(role, minimum)`).

### Las tres funciones que usa cada Server Action

```ts
requireSession(minimumRole?)  // cualquier usuario autenticado; opcionalmente exige un rol mínimo
requireManager()              // = requireSession("SUPERVISOR")
requireAdmin()                // = requireSession("ADMIN")
```

Cada acción en `app/actions/*.ts` llama una de estas al principio. **No existe un middleware centralizado de autorización para las mutaciones** — la responsabilidad está distribuida, a propósito, en cada acción.

## Verificación en capas en las páginas de `/admin`

`app/admin/layout.tsx` hace su propio `getServerSession()` fresco y admite `ADMIN` + `SUPERVISOR`. Además, cada sub-página ADMIN-only (`users`, `settings`, `inventory/import`) repite su propia verificación de rol — no confían en que el layout sea suficiente. Es deliberadamente redundante: cada capa es barata y evita que un refactor futuro del layout abra un agujero de seguridad silencioso.

## Ver también
- [[01-Arquitectura]] (diagrama de proxy)
- [[04-Reglas-de-negocio]]
