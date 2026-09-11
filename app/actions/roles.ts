"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin, PERMISSION_KEYS, type PermissionKey } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";

/** The two roles whose permissions an ADMIN can configure. ADMIN itself is
 * never listed — it always has every permission, unconditionally. */
const CONFIGURABLE_ROLES = ["SUPERVISOR", "CASHIER"] as const;
type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

export interface RolePermissionsRow {
    role: ConfigurableRole;
    permissions: PermissionKey[];
}

/** Current delegable permissions for SUPERVISOR and CASHIER. */
export async function getRolePermissions(): Promise<RolePermissionsRow[]> {
    try {
        await requireAdmin();
        const roles = await prisma.role.findMany({
            where: { name: { in: [...CONFIGURABLE_ROLES] } },
            select: { name: true, permissions: true },
        });
        return CONFIGURABLE_ROLES.map((name) => {
            const row = roles.find((r) => r.name === name);
            const known = (row?.permissions ?? []).filter((p): p is PermissionKey => (PERMISSION_KEYS as readonly string[]).includes(p));
            return { role: name, permissions: known };
        });
    } catch (error) {
        console.error("[getRolePermissions]", error);
        return CONFIGURABLE_ROLES.map((name) => ({ role: name, permissions: [] }));
    }
}

/** ADMIN only: overwrite which of the five delegable permissions a role has. */
export async function updateRolePermissions(role: ConfigurableRole, permissions: PermissionKey[]): Promise<ActionResult> {
    try {
        await requireAdmin();
        if (!CONFIGURABLE_ROLES.includes(role)) return fail("Rol inválido.");
        const clean = Array.from(new Set(permissions)).filter((p) => (PERMISSION_KEYS as readonly string[]).includes(p));

        await prisma.role.update({ where: { name: role }, data: { permissions: clean } });
        revalidatePath("/admin/settings");
        return ok();
    } catch (error) {
        console.error("[updateRolePermissions]", error);
        return fail(toUserMessage(error, "No se pudieron guardar los permisos."));
    }
}
