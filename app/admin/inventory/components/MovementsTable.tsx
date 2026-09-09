"use client";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import type { MovementRow } from "@/app/actions/product";

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
    SALE: { label: "Venta", cls: "bg-primary/10 text-primary" },
    CANCEL: { label: "Anulación", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    PURCHASE: { label: "Entrada", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    WASTE: { label: "Merma", cls: "bg-destructive/10 text-destructive" },
    ADJUSTMENT: { label: "Ajuste", cls: "bg-muted text-foreground" },
    IMPORT: { label: "Importación", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
};

export function MovementsTable({ rows }: { rows: MovementRow[] }) {
    const [q, setQ] = useState("");
    const [type, setType] = useState("ALL");
    const filtered = useMemo(() => rows.filter((r) =>
        (type === "ALL" || r.type === type) &&
        (q === "" || `${r.productName} ${r.productCode} ${r.reason ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    ), [rows, q, type]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto, código o motivo…"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-xl bg-muted/50 border border-border px-3 text-sm">
                    <option value="ALL">Todos los tipos</option>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download */}
                <a href="/api/export/movements" className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border border-border text-sm font-semibold hover:border-primary hover:text-primary transition-colors">
                    <Download className="w-4 h-4" /> CSV
                </a>
            </div>

            <div className="rounded-2xl border border-border overflow-x-auto bg-card">
                <table className="w-full text-sm min-w-[720px]">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-2.5">Fecha</th>
                            <th className="text-left px-4 py-2.5">Producto</th>
                            <th className="text-left px-4 py-2.5">Tipo</th>
                            <th className="text-right px-4 py-2.5">Cantidad</th>
                            <th className="text-right px-4 py-2.5">Stock después</th>
                            <th className="text-left px-4 py-2.5">Motivo / Usuario</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin movimientos.</td></tr>
                        ) : filtered.map((r) => {
                            const t = TYPE_LABEL[r.type] ?? { label: r.type, cls: "bg-muted" };
                            return (
                                <tr key={r.id} className="border-t border-border/50">
                                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{new Date(r.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}</td>
                                    <td className="px-4 py-2.5"><div className="font-medium">{r.productName}</div><div className="text-xs font-mono text-muted-foreground">{r.productCode}</div></td>
                                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${t.cls}`}>{t.label}</span></td>
                                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.quantity < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{r.quantity > 0 ? "+" : ""}{r.quantity}</td>
                                    <td className="px-4 py-2.5 text-right font-mono">{r.stockAfter}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{r.reason ?? ""}{r.userName ? <span className="block text-xs">{r.userName}</span> : null}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
