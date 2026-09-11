import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getEffectivePermissions, hasPermission, type PermissionKey } from "@/lib/auth";
import AdminSidebar from "./components/AdminSidebar";
import AdminMobileNav from "./components/AdminMobileNav";

/**
 * Defense in depth: the proxy (middleware) decodes the JWT cookie directly
 * without re-running the `jwt` callback, so a session invalidated by a
 * password change (see passwordChangedAt in the auth route) can look valid
 * to the proxy until the browser's next session refresh. getServerSession()
 * here always re-runs that callback, so this check is never stale.
 *
 * A CASHIER used to be turned away unconditionally. Now they're let through
 * if an ADMIN granted them any delegable permission (Ajustes → Roles y
 * Permisos) — the proxy already exempts /admin/inventory for them (see
 * proxy.ts), but this is the authoritative, DB-backed check that actually
 * decides it, and what computes which nav items they're allowed to see.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    const role = session.user.role as "ADMIN" | "SUPERVISOR" | "CASHIER";

    const permissions = await getEffectivePermissions();
    if (role === "CASHIER" && permissions !== "ALL" && permissions.length === 0) redirect("/pos");

    // SUPERVISOR/ADMIN see every non-admin-only item unconditionally (today's
    // behavior, unchanged); a CASHIER sees only what their permissions unlock.
    const canSee = (permKeys: PermissionKey[]) => role !== "CASHIER" || permKeys.some((k) => hasPermission(permissions, k));
    const visiblePaths = [
        canSee(["VIEW_DASHBOARD"]) ? "/admin" : null,
        canSee(["RECEIVE_INVENTORY", "MANAGE_CATALOG"]) ? "/admin/inventory" : null,
        canSee(["VIEW_REPORTS"]) ? "/admin/sales" : null,
        role === "ADMIN" ? "/admin/users" : null,
        role === "ADMIN" ? "/admin/settings" : null,
    ].filter((p): p is string => p !== null);

    return (
        <div className="min-h-screen bg-muted/40 font-sans flex text-foreground pb-20 md:pb-0">
            {/* Sidebar (Fixed width 64 = 16rem/256px) - Hidden on mobile */}
            <div className="hidden md:block">
                <AdminSidebar role={role} visiblePaths={visiblePaths} />
            </div>

            {/* Main Content wrapper */}
            <main className="flex-1 w-full md:ml-64 p-4 md:p-8 animate-in fade-in duration-500">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <AdminMobileNav role={role} visiblePaths={visiblePaths} />
            </div>
        </div>
    );
}
