"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Receipt, Users, Settings, LineChart } from "lucide-react";

const NAV_ITEMS = [
    { name: "Resumen", href: "/admin", icon: LineChart, adminOnly: false },
    { name: "Inventario", href: "/admin/inventory", icon: Package, adminOnly: false },
    { name: "Ventas", href: "/admin/sales", icon: Receipt, adminOnly: false },
    { name: "Personal", href: "/admin/users", icon: Users, adminOnly: true },
    { name: "Ajustes", href: "/admin/settings", icon: Settings, adminOnly: true },
];

export default function AdminMobileNav({ role }: { role: "ADMIN" | "SUPERVISOR" }) {
    const pathname = usePathname();
    const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN");

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
