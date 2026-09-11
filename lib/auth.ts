import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { PERMISSION_KEYS, hasPermission, type PermissionKey } from "@/lib/permissions";
export { PERMISSION_KEYS, PERMISSION_LABEL, hasPermission, type PermissionKey } from "@/lib/permissions";

export type Role = "ADMIN" | "SUPERVISOR" | "CASHIER";

export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: Role;
}

export class AuthError extends Error {
    constructor(message = "No autenticado") {
        super(message);
        this.name = "AuthError";
    }
}

/**
 * Three-tier role model, matching how retail/restaurant POS systems (Square,
 * Toast, Clover) split access:
 *
 * - ADMIN (dueño): everything. Only ADMIN manages staff accounts, cash
 *   registers, business settings, and bulk data imports — actions that can
 *   lock everyone else out or corrupt the catalog if misused.
 * - SUPERVISOR (encargado de turno / gerente): full day-to-day operational
 *   control — sees dashboards and sales reports, manages the product
 *   catalog and stock (entradas/mermas/ajustes), and can void a sale with a
 *   reason. Cannot touch staff, registers, or settings.
 * - CASHIER (cajero): the POS only — sell, open/close their own shift,
 *   apply discounts, split bills, manage customers. No back-office access
 *   at all.
 *
 * `requireSession()` with no roles just requires *any* authenticated user
 * (this is what every POS action uses). Pass a role to also require it —
 * ADMIN always passes every check, and SUPERVISOR passes anything CASHIER
 * would.
 *
 * This hierarchy is the *default*, not the ceiling: five of SUPERVISOR's
 * capabilities (see PERMISSION_KEYS below) can be delegated down to CASHIER,
 * or taken away from SUPERVISOR, per business — configured in Ajustes →
 * Roles y Permisos and enforced via requirePermission(), not roleAtLeast().
 */
export const ROLE_RANK: Record<Role, number> = { CASHIER: 0, SUPERVISOR: 1, ADMIN: 2 };

export function roleAtLeast(role: Role, minimum: Role): boolean {
    return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * Returns the authenticated user or throws.
 * Pass a minimum role to also require it (e.g. requireSession("SUPERVISOR")
 * lets ADMIN and SUPERVISOR through, rejects CASHIER).
 */
export async function requireSession(minimumRole?: Role): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    const user = session?.user as Partial<SessionUser> | undefined;
    if (!user?.id) throw new AuthError();

    const role = (user.role ?? "CASHIER") as Role;
    if (minimumRole && !roleAtLeast(role, minimumRole)) {
        throw new AuthError("No tienes permisos para esta acción");
    }

    return { id: user.id, name: user.name ?? "", email: user.email ?? "", role };
}

/** ADMIN only: staff, registers, business settings, bulk imports. */
export const requireAdmin = () => requireSession("ADMIN");

/** ADMIN or SUPERVISOR: dashboards, reports, inventory, voiding a sale. */
export const requireManager = () => requireSession("SUPERVISOR");

/**
 * ADMIN always passes. Otherwise, requires the caller's role to have `key`
 * in its `Role.permissions` (configured in Ajustes → Roles y Permisos) —
 * this is how a business can let a CASHIER receive inventory, say, without
 * promoting them to SUPERVISOR. See `PERMISSION_KEYS` for what's delegable.
 */
export async function requirePermission(key: PermissionKey): Promise<SessionUser> {
    const user = await requireSession();
    if (user.role === "ADMIN") return user;

    const role = await prisma.role.findUnique({ where: { name: user.role }, select: { permissions: true } });
    if (!role?.permissions.includes(key)) {
        throw new AuthError("No tienes permisos para esta acción");
    }
    return user;
}

/**
 * The delegable permissions the current session actually has — "ALL" for
 * ADMIN (it bypasses `Role.permissions` entirely, see requirePermission),
 * otherwise whatever `Role.permissions` says for that role (often none, for
 * a CASHIER nobody has configured). Used to decide what a CASHIER or
 * SUPERVISOR can even see in /admin, not just what a Server Action allows —
 * see admin/layout.tsx.
 */
export async function getEffectivePermissions(): Promise<PermissionKey[] | "ALL"> {
    const user = await requireSession();
    if (user.role === "ADMIN") return "ALL";
    const role = await prisma.role.findUnique({ where: { name: user.role }, select: { permissions: true } });
    return ((role?.permissions ?? []).filter((p): p is PermissionKey => (PERMISSION_KEYS as readonly string[]).includes(p)));
}
