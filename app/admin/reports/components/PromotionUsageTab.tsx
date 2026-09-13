"use client";
import { formatMoney } from "@/app/lib/money";
import type { PromotionUsageRow } from "@/app/actions/report";

export function PromotionUsageTab({ rows }: { rows: PromotionUsageRow[] }) {
    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm text-center py-10">Ninguna promoción se aplicó en este período.</p>;
    }

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="text-left">
                        <th className="py-3 px-4 font-semibold">Promoción</th>
                        <th className="py-3 px-4 font-semibold text-right">Veces usada</th>
                        <th className="py-3 px-4 font-semibold text-right">Descuento total</th>
                        <th className="py-3 px-4 font-semibold text-right">Ingresos de esas ventas</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.promotionId} className="border-t border-border/50 hover:bg-accent/50 transition-colors">
                            <td className="py-3 px-4 font-medium">{r.promotionName}</td>
                            <td className="py-3 px-4 text-right font-bold">{r.timesUsed}</td>
                            <td className="py-3 px-4 text-right text-destructive">-{formatMoney(r.totalDiscount)}</td>
                            <td className="py-3 px-4 text-right">{formatMoney(r.totalRevenue)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
