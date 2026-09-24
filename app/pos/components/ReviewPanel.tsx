"use client";
import { useState } from "react";
import { AlertTriangle, RotateCw, X, Loader2 } from "lucide-react";
import { useOfflineSalesQueue, retryReviewSale, type RejectedSale } from "@/app/lib/offlineSalesQueue";

/**
 * A queued offline sale that reached the server but was genuinely rejected
 * (stock ran out, the shift closed, a price/promo changed while offline...)
 * lands here instead of being silently retried forever or silently dropped.
 * The cashier decides: reintentar (in case it was transient) or descartar
 * (acknowledge it never went through — the sale must be re-taken manually).
 */
export function ReviewPanel() {
    const needsReview = useOfflineSalesQueue((s) => s.needsReview);
    const dismissReview = useOfflineSalesQueue((s) => s.dismissReview);
    const [busyRef, setBusyRef] = useState<string | null>(null);
    const [confirmingDismiss, setConfirmingDismiss] = useState<string | null>(null);

    if (needsReview.length === 0) return null;

    const handleRetry = async (sale: RejectedSale) => {
        setBusyRef(sale.clientRef);
        try {
            await retryReviewSale(sale.clientRef);
        } finally {
            setBusyRef(null);
        }
    };

    const formatMoney = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

    return (
        <div className="fixed inset-x-0 top-10 z-[300] flex justify-center px-4">
            <div className="w-full max-w-lg bg-card border border-destructive/30 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 text-destructive font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {needsReview.length === 1
                        ? "1 venta pendiente de conexión no se pudo registrar"
                        : `${needsReview.length} ventas pendientes de conexión no se pudieron registrar`}
                </div>
                <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                    {needsReview.map((sale) => (
                        <li key={sale.clientRef} className="p-4 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                    {sale.summary ? `${sale.summary.itemCount} producto(s) — ${formatMoney(sale.summary.total)}` : "Venta sin conexión"}
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {new Date(sale.rejectedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{sale.error}</p>
                            {confirmingDismiss === sale.clientRef ? (
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">¿Descartar? La venta no quedará registrada — cóbrala de nuevo si aplica.</span>
                                    <button
                                        onClick={() => dismissReview(sale.clientRef)}
                                        className="px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground font-semibold"
                                    >
                                        Sí, descartar
                                    </button>
                                    <button
                                        onClick={() => setConfirmingDismiss(null)}
                                        className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleRetry(sale)}
                                        disabled={busyRef === sale.clientRef}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                                    >
                                        {busyRef === sale.clientRef ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                                        Reintentar
                                    </button>
                                    <button
                                        onClick={() => setConfirmingDismiss(sale.clientRef)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Descartar
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
