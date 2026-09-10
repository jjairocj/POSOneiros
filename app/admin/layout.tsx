import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import AdminSidebar from "./components/AdminSidebar";
import AdminMobileNav from "./components/AdminMobileNav";

/**
 * Defense in depth: the proxy (middleware) decodes the JWT cookie directly
 * without re-running the `jwt` callback, so a session invalidated by a
 * password change (see passwordChangedAt in the auth route) can look valid
 * to the proxy until the browser's next session refresh. getServerSession()
 * here always re-runs that callback, so this check is never stale.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/pos");

    return (
        <div className="min-h-screen bg-muted/40 font-sans flex text-foreground pb-20 md:pb-0">
            {/* Sidebar (Fixed width 64 = 16rem/256px) - Hidden on mobile */}
            <div className="hidden md:block">
                <AdminSidebar />
            </div>
            
            {/* Main Content wrapper */}
            <main className="flex-1 w-full md:ml-64 p-4 md:p-8 animate-in fade-in duration-500">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <AdminMobileNav />
            </div>
        </div>
    );
}
