"use client";
import { formatMoney } from "@/app/lib/money";
import type { ProductRankingRow } from "@/app/actions/report";

export function ProductRankingTab({ rows }: { rows: ProductRankingRow[] }) {
    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm text-center py-10">Sin ventas en este período.</p>;
    }

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="text-left">
                        <th className="py-3 px-4 font-semibold">Producto</th>
                        <th className="py-3 px-4 font-semibold text-right">Cantidad</th>
                        <th className="py-3 px-4 font-semibold text-right">Ingresos</th>
                        <th className="py-3 px-4 font-semibold text-right">Costo est.</th>
                        <th className="py-3 px-4 font-semibold text-right">Margen</th>
                        <th className="py-3 px-4 font-semibold text-right">Margen %</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.productId} className="border-t border-border/50 hover:bg-accent/50 transition-colors">
                            <td className="py-3 px-4">
                                <div className="font-medium">{r.productName}</div>
                                <div className="text-xs text-muted-foreground font-mono">{r.productCode}</div>
                            </td>
                            <td className="py-3 px-4 text-right font-bold">{r.quantitySold}</td>
                            <td className="py-3 px-4 text-right">{formatMoney(r.revenue)}</td>
                            <td className="py-3 px-4 text-right text-muted-foreground">{formatMoney(r.estimatedCost)}</td>
                            <td className={`py-3 px-4 text-right font-bold ${r.margin < 0 ? "text-destructive" : ""}`}>{formatMoney(r.margin)}</td>
                            <td className={`py-3 px-4 text-right ${r.marginPercent < 0 ? "text-destructive" : "text-muted-foreground"}`}>{r.marginPercent.toFixed(1)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
