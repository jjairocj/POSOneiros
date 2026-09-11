"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updateRolePermissions, type RolePermissionsRow } from "@/app/actions/roles";
import { PERMISSION_KEYS, PERMISSION_LABEL, type PermissionKey } from "@/lib/permissions";

const ROLE_LABEL: Record<string, string> = { SUPERVISOR: "Supervisor", CASHIER: "Cajero" };

/**
 * ADMIN-only grid: which of the five delegable permissions each of
 * SUPERVISOR/CASHIER has. ADMIN itself isn't shown — it always has all of
 * them, and always has the four permissions that aren't delegable at all
 * (personal, cajas, ajustes, importar Siigo — see lib/auth.ts).
 */
export function RolePermissionsForm({ initial }: { initial: RolePermissionsRow[] }) {
    const router = useRouter();
    const [rows, setRows] = useState(initial);
    const [savingRole, setSavingRole] = useState<string | null>(null);

    const toggle = async (role: RolePermissionsRow["role"], key: PermissionKey, checked: boolean) => {
        const current = rows.find((r) => r.role === role)?.permissions ?? [];
        const next = checked ? [...current, key] : current.filter((p) => p !== key);
        setRows((prev) => prev.map((r) => (r.role === role ? { ...r, permissions: next } : r)));

        setSavingRole(role);
        const res = await updateRolePermissions(role, next);
        setSavingRole(null);
        if (!res.ok) {
            toast.error(res.error);
            setRows((prev) => prev.map((r) => (r.role === role ? { ...r, permissions: current } : r))); // revert
            return;
        }
        router.refresh();
    };

    return (
        <div className="bg-card border border-border rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Roles y Permisos</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
                Qué puede hacer cada rol más allá de la caja. El Administrador siempre tiene acceso completo;
                personal, cajas, ajustes e importación de Siigo son exclusivos de Administrador y no se pueden delegar.
            </p>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left font-semibold py-2 pr-4">Permiso</th>
                            {rows.map((r) => (
                                <th key={r.role} className="text-center font-semibold py-2 px-4 whitespace-nowrap">
                                    {ROLE_LABEL[r.role] ?? r.role}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {PERMISSION_KEYS.map((key) => (
                            <tr key={key} className="border-b border-border/50 last:border-0">
                                <td className="py-3 pr-4 text-muted-foreground">{PERMISSION_LABEL[key]}</td>
                                {rows.map((r) => (
                                    <td key={r.role} className="text-center py-3 px-4">
                                        <Switch
                                            checked={r.permissions.includes(key)}
                                            disabled={savingRole === r.role}
                                            onCheckedChange={(checked) => toggle(r.role, key, checked)}
                                            aria-label={`${PERMISSION_LABEL[key]} para ${ROLE_LABEL[r.role]}`}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
