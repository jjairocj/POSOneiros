import React from "react";
import AdminSidebar from "./components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-muted/40 font-sans flex text-foreground">
            {/* Sidebar (Fixed width 64 = 16rem/256px) */}
            <AdminSidebar />
            
            {/* Main Content wrapper */}
            <main className="flex-1 ml-64 p-8 animate-in fade-in duration-500">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
