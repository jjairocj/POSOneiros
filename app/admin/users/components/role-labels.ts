/** Spanish display name + Tailwind badge classes for each system role. */
export const ROLE_LABEL: Record<string, string> = {
    ADMIN: "Administrador",
    SUPERVISOR: "Supervisor",
    CASHIER: "Cajero",
};

export const ROLE_DESCRIPTION: Record<string, string> = {
    ADMIN: "Acceso total: personal, cajas y ajustes del negocio.",
    SUPERVISOR: "Ventas, inventario y anular ventas. No gestiona personal ni ajustes.",
    CASHIER: "Solo el punto de venta: vender y su propio turno.",
};

export const ROLE_BADGE_CLASS: Record<string, string> = {
    ADMIN: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    SUPERVISOR: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    CASHIER: "bg-green-500/15 text-green-700 dark:text-green-300",
};

export function roleLabel(name: string): string {
    return ROLE_LABEL[name] ?? name;
}
