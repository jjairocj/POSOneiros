/**
 * Pure constants, safe to import from client components — unlike lib/auth.ts,
 * which pulls in prisma/pg and can't be bundled for the browser. Keep this
 * file free of any server-only import.
 */

/**
 * Delegable permissions: the five SUPERVISOR-level capabilities an ADMIN can
 * choose to also grant to CASHIER (or revoke from SUPERVISOR), configured in
 * Ajustes → Roles y Permisos and stored on `Role.permissions`.
 *
 * Deliberately NOT delegable, no matter what `Role.permissions` says: staff
 * accounts, cash registers, business settings, and the Siigo bulk importer —
 * each can lock everyone else out or corrupt the catalog if misused, so
 * they stay behind requireAdmin() directly at the call site.
 */
export const PERMISSION_KEYS = [
    "VIEW_DASHBOARD",
    "MANAGE_CATALOG",
    "RECEIVE_INVENTORY",
    "VOID_SALE",
    "VIEW_REPORTS",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABEL: Record<PermissionKey, string> = {
    VIEW_DASHBOARD: "Ver el resumen ejecutivo",
    MANAGE_CATALOG: "Gestionar categorías y productos",
    RECEIVE_INVENTORY: "Recibir mercancía (lotes, insumos, entradas/mermas)",
    VOID_SALE: "Anular una venta",
    VIEW_REPORTS: "Ver reportes e historial de ventas",
};
