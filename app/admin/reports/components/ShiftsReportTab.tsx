"use client";
import { formatMoney } from "@/app/lib/money";
import type { ShiftReportRow } from "@/app/actions/report";

const fmt = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const STATUS_LABEL: Record<string, string> = { OPEN: "Abierto", CLOSING: "Cerrando", CLOSED: "Cerrado" };

export function ShiftsReportTab({ rows }: { rows: ShiftReportRow[] }) {
    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm text-center py-10">Sin turnos en este período.</p>;
    }

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="text-left">
                        <th className="py-3 px-4 font-semibold">Caja / Cajero</th>
                        <th className="py-3 px-4 font-semibold">Apertura</th>
                        <th className="py-3 px-4 font-semibold">Cierre</th>
                        <th className="py-3 px-4 font-semibold">Estado</th>
                        <th className="py-3 px-4 font-semibold text-right">Ventas</th>
                        <th className="py-3 px-4 font-semibold text-right">Total vendido</th>
                        <th className="py-3 px-4 font-semibold text-right">Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.shiftId} className="border-t border-border/50 hover:bg-accent/50 transition-colors">
                            <td className="py-3 px-4">
                                <div className="font-medium">{r.registerName}</div>
                                <div className="text-xs text-muted-foreground">{r.userName}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">{fmt(r.startTime)}</td>
                            <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">{r.endTime ? fmt(r.endTime) : "—"}</td>
                            <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-md uppercase ${r.status === "OPEN" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : r.status === "CLOSING" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                                    {STATUS_LABEL[r.status] ?? r.status}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold">{r.transactionCount}</td>
                            <td className="py-3 px-4 text-right">{formatMoney(r.totalSales)}</td>
                            <td className={`py-3 px-4 text-right font-bold ${r.difference == null ? "text-muted-foreground" : r.difference < 0 ? "text-destructive" : r.difference > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                                {r.difference == null ? "—" : formatMoney(r.difference)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
