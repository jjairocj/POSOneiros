import React from "react";
import AdminSidebar from "./components/AdminSidebar";
import AdminMobileNav from "./components/AdminMobileNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
