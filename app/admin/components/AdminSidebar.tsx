"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Receipt, Users, Settings, LogOut, LineChart } from "lucide-react";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
    { name: "Resumen", href: "/admin", icon: LineChart },
    { name: "Inventario", href: "/admin/inventory", icon: Package },
    { name: "Ventas", href: "/admin/sales", icon: Receipt },
    { name: "Usuarios y Cajas", href: "/admin/users", icon: Users },
    { name: "Ajustes", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-sm flex flex-col transition-all duration-300">
            {/* Logo area */}
            <div className="h-16 flex items-center px-6 border-b border-border/50 bg-primary/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
                        <span className="text-primary-foreground font-black text-xs tracking-tighter">OP</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">Oneiros <span className="text-primary">Admin</span></span>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                    
                    return (
                        <Link 
                            key={item.href} 
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                                isActive 
                                    ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20" 
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm"
                            }`}
                        >
                            {/* Animated hover background effect for inactive items */}
                            {!isActive && (
                                <span className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 ease-out z-0" />
                            )}
                            
                            <item.icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-primary"}`} />
                            <span className="relative z-10">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-border mt-auto">
                <Link 
                    href="/pos" 
                    className="flex w-full items-center justify-center gap-2 mb-3 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-black/5 hover:dark:bg-white/5 transition-colors font-semibold text-sm border border-border"
                >
                    Ir al Punto de Venta (TPV)
                </Link>
                <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-medium border border-transparent hover:border-destructive/20"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}
