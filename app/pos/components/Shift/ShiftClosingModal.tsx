/**
 * @file ShiftClosingModal.tsx
 * @description Two-stage modal for closing a cashier's shift.
 *
 * STAGE 1 — Cash reconciliation form
 *   The cashier enters the physical cash total in the drawer. On submit the
 *   `closeShift` server action is called. The button is disabled while the
 *   field is empty to prevent accidental empty submissions.
 *
 * STAGE 2 — Narrative Z-report summary
 *   After a successful close the modal transitions to a storytelling view that
 *   shows the cashier how their shift went, following the "desenlace" arc from
 *   the design spec:
 *
 *   - Personalised closing message ("¡Buen turno, [first name]!")
 *   - Transaction count and total revenue (the main numbers)
 *   - Product estrella (top product by quantity — shown only when > 0 sales)
 *   - Hora pico in 12h format (shown only when > 0 sales)
 *   - Cash reconciliation: expected vs declared vs difference
 *     - difference < 0 → red (shortage)
 *     - difference > 0 → amber (surplus, unusual)
 *     - difference = 0 → green (perfect match)
 *
 * "Confirmar y Salir" calls router.refresh() then window.location.reload() to
 * force ShiftGuard to re-evaluate (the shift is now CLOSED server-side).
 *
 * @param activeShiftId - ID of the shift to close.
 * @param onCancel      - Called when the user dismisses stage 1 without closing.
 */

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { closeShift, type ShiftSummary } from "@/app/actions/shift";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, CheckCircle2, Trophy, Clock, ShoppingBag, TrendingUp, Banknote, CreditCard, ArrowRightLeft, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

/** Converts a 0–23 hour integer to a human-readable 12h string. */
function formatHour(h: number) {
    const period = h >= 12 ? "pm" : "am";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${period}`;
}

export default function ShiftClosingModal({ activeShiftId, onCancel }: { activeShiftId: string; onCancel: () => void }) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [summary, setSummary] = useState<ShiftSummary | null>(null);
    const router = useRouter();

    const handleCloseShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const closeAmount = parseFloat(amount);
        if (isNaN(closeAmount) || closeAmount < 0) {
            setError("Monto inválido");
            return;
        }

        setLoading(true);
        try {
            const res = await closeShift(activeShiftId, closeAmount);
            if (!res.ok) { setError(res.error); return; }
            setSummary(res.data.summary);
        } catch {
            setError("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = () => {
        router.refresh();
        window.location.reload();
    };

    if (summary) {
        const differenceColor =
            summary.difference < 0
                ? "text-destructive"
                : summary.difference > 0
                ? "text-amber-500"
                : "text-emerald-500";

        const closingMessage = summary.userName
            ? `¡Buen turno, ${summary.userName.split(" ")[0]}!`
            : "¡Buen turno!";

        return createPortal(
            <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto p-4">
                <div className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-border my-auto">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-2 mb-6">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">{closingMessage}</h2>
                        <p className="text-muted-foreground text-sm">Aquí está el resumen de tu turno.</p>
                    </div>

                    {/* Narrative stats */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-muted/50 rounded-2xl p-4 border border-border/50 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                <ShoppingBag className="w-3.5 h-3.5" />
                                Transacciones
                            </div>
                            <span className="text-2xl font-black text-foreground">{summary.transactionCount}</span>
                        </div>
                        <div className="bg-muted/50 rounded-2xl p-4 border border-border/50 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                <TrendingUp className="w-3.5 h-3.5" />
                                Total Ventas
                            </div>
                            <span className="text-2xl font-black text-foreground">${summary.totalSales.toLocaleString()}</span>
                        </div>
                        {summary.topProduct && (
                            <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
                                    <Trophy className="w-3.5 h-3.5" />
                                    Producto estrella
                                </div>
                                <span className="text-sm font-bold text-foreground leading-tight">{summary.topProduct}</span>
                            </div>
                        )}
                        {summary.peakHour !== null && (
                            <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20 flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wider">
                                    <Clock className="w-3.5 h-3.5" />
                                    Hora pico
                                </div>
                                <span className="text-sm font-bold text-foreground">{formatHour(summary.peakHour)}</span>
                            </div>
                        )}
                    </div>

                    {/* Payment breakdown */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div className="bg-muted/40 rounded-2xl p-3 border border-border/50">
                            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><Banknote className="w-3 h-3" />Efectivo</div>
                            <div className="text-sm font-black mt-1">${summary.cashSales.toLocaleString()}</div>
                        </div>
                        <div className="bg-muted/40 rounded-2xl p-3 border border-border/50">
                            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><CreditCard className="w-3 h-3" />Tarjeta</div>
                            <div className="text-sm font-black mt-1">${summary.cardSales.toLocaleString()}</div>
                        </div>
                        <div className="bg-muted/40 rounded-2xl p-3 border border-border/50">
                            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><ArrowRightLeft className="w-3 h-3" />Transf.</div>
                            <div className="text-sm font-black mt-1">${summary.transferSales.toLocaleString()}</div>
                        </div>
                    </div>
                    {summary.cancelledCount > 0 && (
                        <p className="text-xs text-muted-foreground text-center mb-4">{summary.cancelledCount} venta{summary.cancelledCount === 1 ? "" : "s"} anulada{summary.cancelledCount === 1 ? "" : "s"} (no cuentan en los totales).</p>
                    )}

                    {/* Cash reconciliation */}
                    <div className="space-y-3 mb-6 bg-muted/50 p-5 rounded-2xl border border-border/50">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">Esperado en efectivo</span>
                            <strong>${summary.expected.toLocaleString()}</strong>
                        </div>
                        <p className="text-[11px] text-muted-foreground -mt-2">Base + ventas en efectivo. Tarjeta y transferencia no van en el cajón.</p>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">Monto Declarado</span>
                            <strong>${summary.declared.toLocaleString()}</strong>
                        </div>
                        <Separator />
                        <div className={`flex justify-between items-center ${differenceColor}`}>
                            <span className="font-semibold text-sm">Diferencia</span>
                            <strong className="text-lg">
                                {summary.difference < 0
                                    ? `-$${Math.abs(summary.difference).toLocaleString()}`
                                    : `+$${summary.difference.toLocaleString()}`}
                            </strong>
                        </div>
                    </div>

                    <a
                        href={`/api/export/shift?id=${activeShiftId}`}
                        className="flex items-center justify-center gap-2 w-full h-11 mb-3 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                    >
                        Descargar detalle del turno (Excel/CSV)
                    </a>
                    <Button
                        onClick={handleAcknowledge}
                        className="w-full h-12 rounded-2xl text-base font-bold shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Confirmar y Salir
                    </Button>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto p-4">
            <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-border my-auto">
                <div className="flex flex-col items-center text-center space-y-2 mb-8">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                        <LogOut className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Cerrar Turno</h2>
                    <p className="text-muted-foreground text-sm">
                        Cuenta solo el efectivo del cajón (incluida la base) para hacer el arqueo.
                    </p>
                </div>

                <form onSubmit={handleCloseShift} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="closeAmount" className="text-sm font-semibold text-foreground ml-1">Efectivo contado en caja ($)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <Input
                                id="closeAmount"
                                type="number"
                                min="0"
                                step="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Ej. 150000"
                                required
                                className="pl-8 h-12 text-lg rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 h-12 rounded-2xl font-semibold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={loading || !amount}
                            className="flex-1 h-12 rounded-2xl font-semibold shadow-lg shadow-destructive/20 hover:-translate-y-0.5 transition-all"
                        >
                            {loading ? "Calculando..." : "Cerrar Turno"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
