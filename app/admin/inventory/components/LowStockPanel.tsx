"use client";

import { AlertTriangle, PackageOpen } from "lucide-react";
import Link from "next/link";
import { formatMoney } from "@/app/lib/money";

export interface LowStockProduct {
    id: string;
    code: string;
    name: string;
    stock: number;
    price: number;
}

interface Props {
    products: LowStockProduct[];
    threshold?: number;
}

export function LowStockPanel({ products, threshold = 5 }: Props) {
    if (products.length === 0) return (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
            <PackageOpen className="w-5 h-5 shrink-0" />
            Todo el inventario tiene stock suficiente.
        </div>
    );

    return (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-500/15">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {products.length} {products.length === 1 ? "producto" : "productos"} con stock ≤ {threshold}
                </p>
            </div>
            <ul className="divide-y divide-amber-500/10 max-h-64 overflow-y-auto">
                {products.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-amber-500/5 transition-colors">
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-3">
                            <span className="text-xs text-muted-foreground">{formatMoney(p.price)}</span>
                            <span className={`text-sm font-black px-2 py-0.5 rounded-full ${
                                p.stock === 0
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}>
                                {p.stock === 0 ? "Agotado" : `${p.stock} uds`}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="px-5 py-3 border-t border-amber-500/15">
                <Link
                    href="/admin/inventory"
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                    Ver inventario completo →
                </Link>
            </div>
        </div>
    );
}
