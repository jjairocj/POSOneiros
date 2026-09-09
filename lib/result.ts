/**
 * Uniform return type for Server Actions.
 * Never throw from an action for expected failures: in production Next.js
 * replaces thrown error messages with a generic one, so the user never sees
 * "Stock insuficiente". Return { ok: false, error } instead.
 */
export type ActionResult<T = void> =
    | ({ ok: true } & (T extends void ? { data?: undefined } : { data: T }))
    | { ok: false; error: string };

/** An expected, user-facing failure. Its message is safe to show as-is. */
export class UserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UserError";
    }
}

export const ok = <T>(data?: T): ActionResult<T> => ({ ok: true, data } as ActionResult<T>);
export const fail = <T = void>(error: string): ActionResult<T> => ({ ok: false, error });

/** Translates Prisma / auth errors into a message a cashier can understand. */
export function toUserMessage(err: unknown, fallback = "Ocurrió un error inesperado"): string {
    if (!err || typeof err !== "object") return fallback;
    const e = err as { name?: string; code?: string; message?: string; meta?: { target?: string[] | string } };

    if (e.name === "AuthError" || e.name === "UserError") return e.message ?? fallback;

    switch (e.code) {
        case "P2002": {
            const target = Array.isArray(e.meta?.target) ? e.meta?.target.join(", ") : e.meta?.target;
            if (target?.includes("code")) return "Ya existe un producto con ese código.";
            if (target?.includes("email")) return "Ya existe un usuario con ese correo.";
            if (target?.includes("documentId")) return "Ya existe un cliente con ese documento.";
            return "Ya existe un registro con esos datos.";
        }
        case "P2003":
            return "No se puede completar: hay registros relacionados (ventas, turnos o productos).";
        case "P2025":
            return "El registro ya no existe.";
        case "ECONNREFUSED":
        case "P1001":
            return "No hay conexión con la base de datos.";
    }

    return fallback;
}
