"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Receipt, Users, Settings, LineChart, ShoppingCart } from "lucide-react";

const NAV_ITEMS = [
    { name: "Resumen", href: "/admin", icon: LineChart },
    { name: "Inventario", href: "/admin/inventory", icon: Package },
    { name: "Ventas", href: "/admin/sales", icon: Receipt },
    { name: "Personal", href: "/admin/users", icon: Users },
    { name: "Ajustes", href: "/admin/settings", icon: Settings },
];

// Always visible regardless of role/permissions, same as AdminSidebar's
// "Ir al Punto de Venta (TPV)" link — every admin/cashier needs a way back
// into the POS, and this was the only nav missing it.
const POS_ITEM = { name: "TPV", href: "/pos", icon: ShoppingCart };

interface AdminMobileNavProps {
    role: "ADMIN" | "SUPERVISOR" | "CASHIER";
    visiblePaths: string[];
}

export default function AdminMobileNav({ visiblePaths }: AdminMobileNavProps) {
    const pathname = usePathname();
    const items = [...NAV_ITEMS.filter((item) => visiblePaths.includes(item.href)), POS_ITEM];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg pb-safe flex justify-around items-center h-16 px-2">
            {items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                
                return (
                    <Link 
                        key={item.href} 
                        href={item.href}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                            isActive 
                                ? "text-primary font-bold" 
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                        <span className="text-[10px] leading-none tracking-tight">{item.name}</span>
                    </Link>
                )
            })}
        </nav>
    );
}
