import { CalendarClock, PackageOpen } from "lucide-react";
import type { ExpiringItem } from "@/app/actions/lots";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short" });

function daysUntil(iso: string): number {
    const ms = new Date(iso).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Product lots and active raw-material lots expiring soon, for salubridad audits. */
export function ExpiringLotsPanel({ items, daysAhead = 7 }: { items: ExpiringItem[]; daysAhead?: number }) {
    if (items.length === 0) return (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
            <PackageOpen className="w-5 h-5 shrink-0" />
            Nada por vencer en los próximos {daysAhead} días.
        </div>
    );

    return (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-500/15">
                <CalendarClock className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {items.length} {items.length === 1 ? "lote vence" : "lotes vencen"} en los próximos {daysAhead} días
                </p>
            </div>
            <ul className="divide-y divide-amber-500/10 max-h-64 overflow-y-auto">
                {items.map((item) => {
                    const days = daysUntil(item.expirationDate);
                    return (
                        <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-amber-500/5 transition-colors">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm text-foreground truncate">
                                    {item.name}
                                    {item.kind === "raw-material" && <span className="text-xs font-normal text-muted-foreground ml-1.5">(insumo)</span>}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {item.lotNumber ? `Lote ${item.lotNumber}` : "Sin número de lote"}
                                    {item.quantityRemaining != null && ` · ${item.quantityRemaining} uds`}
                                </p>
                            </div>
                            <span className={`text-sm font-black px-2 py-0.5 rounded-full shrink-0 ml-3 ${
                                days <= 0 ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}>
                                {days <= 0 ? "Vencido" : `${fmtDate(item.expirationDate)} (${days}d)`}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
