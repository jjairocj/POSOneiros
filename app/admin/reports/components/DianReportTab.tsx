"use client";
import { formatMoney } from "@/app/lib/money";
import type { DianReportRow, DianReportTotals } from "@/app/actions/report";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Mirrors exactly what the .xlsx export sends (app/api/export/[kind]/route.ts,
 * kind=dian) — one row per completed sale, shaped for manually re-typing
 * into the DIAN e-invoicing portal: fecha, factura, documento/nombre del
 * comprador, forma y medio de pago, y el desglose de impuestos.
 */
export function DianReportTab({ rows, totals }: { rows: DianReportRow[]; totals: DianReportTotals }) {
    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm text-center py-10">Sin ventas completadas en este período.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm rounded-2xl p-4">
                Para la carga manual en el portal de la DIAN. Las ventas <strong>anuladas no se incluyen</strong> aquí
                — esas requieren una nota crédito en la DIAN, no una factura nueva. El consumidor final sin documento
                queda con el número genérico 222222222, igual que en el recibo impreso.
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr className="text-left">
                            <th className="py-3 px-4 font-semibold">Fecha</th>
                            <th className="py-3 px-4 font-semibold">Factura</th>
                            <th className="py-3 px-4 font-semibold">Documento</th>
                            <th className="py-3 px-4 font-semibold">Nombre</th>
                            <th className="py-3 px-4 font-semibold">Medio de pago</th>
                            <th className="py-3 px-4 font-semibold text-right">Base</th>
                            <th className="py-3 px-4 font-semibold text-right">IVA</th>
                            <th className="py-3 px-4 font-semibold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.saleId} className="border-t border-border/50 hover:bg-accent/50 transition-colors">
                                <td className="py-2.5 px-4 whitespace-nowrap">{fmtDate(r.date)}</td>
                                <td className="py-2.5 px-4 font-mono font-bold">{r.receiptNumber}</td>
                                <td className="py-2.5 px-4 font-mono text-muted-foreground">{r.documentId}</td>
                                <td className="py-2.5 px-4">{r.customerName}</td>
                                <td className="py-2.5 px-4 text-muted-foreground">{r.paymentMethod}</td>
                                <td className="py-2.5 px-4 text-right">{formatMoney(r.base)}</td>
                                <td className="py-2.5 px-4 text-right text-muted-foreground">{formatMoney(r.iva)}</td>
                                <td className="py-2.5 px-4 text-right font-bold">{formatMoney(r.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-bold">
                        <tr className="border-t border-border">
                            <td className="py-3 px-4" colSpan={5}>Totales · {totals.count} factura{totals.count === 1 ? "" : "s"}</td>
                            <td className="py-3 px-4 text-right">{formatMoney(totals.base)}</td>
                            <td className="py-3 px-4 text-right">{formatMoney(totals.iva)}</td>
                            <td className="py-3 px-4 text-right">{formatMoney(totals.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
