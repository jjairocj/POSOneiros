/**
 * @file ShiftClosingModal.tsx
 * @description Three-stage modal for closing a cashier's shift.
 *
 * STAGE 1 — Count form
 *   Shows the opening base (read-only, for reference only) and asks for what
 *   the cashier counted: cash from sales — SEPARATE from the base, which
 *   stays in the drawer untouched — plus transfers and card/datáfono totals.
 *   Nothing about expected amounts is shown yet, so the count stays blind.
 *
 * STAGE 2 — Reconciliation review (after clicking "Cerrar Turno")
 *   Submitting the count freezes it on the server and returns the expected
 *   figures: expected vs counted per method with the differences. The count
 *   can NOT be edited from here on — no "back" button, and reopening the
 *   modal resumes at this screen with the frozen values. If anything doesn't
 *   match, a reason is required before closing (also enforced server-side).
 *
 * STAGE 3 — Z-report summary
 *   Compact stats, reconciliation per method, the recorded reason and the
 *   .xlsx download. "Confirmar y Salir" reloads so ShiftGuard sees the shift
 *   is CLOSED.
 *
 * @param activeShiftId - ID of the shift to close.
 * @param baseAmount    - Opening base, shown read-only in stage 1.
 * @param onCancel      - Called when the user dismisses without closing.
 */

"use client";

import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { closeShift, getShiftClosePreview, getShiftCloseState, type ShiftSummary, type ShiftClosePreview } from "@/app/actions/shift";
import { Hint } from "@/app/components/TutorialMode";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { LogOut, CheckCircle2, Trophy, Clock, ShoppingBag, TrendingUp, Banknote, CreditCard, ArrowRightLeft, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;
const signed = (n: number) => (n < 0 ? `-${money(Math.abs(n))}` : `+${money(n)}`);
const diffColor = (n: number) => (n < 0 ? "text-destructive" : n > 0 ? "text-amber-500" : "text-emerald-500");


/** Converts a 0–23 hour integer to a human-readable 12h string. */
function formatHour(h: number) {
    const period = h >= 12 ? "pm" : "am";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${period}`;
}

export default function ShiftClosingModal({ activeShiftId, baseAmount = 0, onCancel }: { activeShiftId: string; baseAmount?: number; onCancel: () => void }) {
    const [cash, setCash] = useState(0);
    const [cashTouched, setCashTouched] = useState(false);
    const [transfer, setTransfer] = useState(0);
    const [card, setCard] = useState(0);
    const [note, setNote] = useState("");
    const [preview, setPreview] = useState<ShiftClosePreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [summary, setSummary] = useState<ShiftSummary | null>(null);
    const router = useRouter();

    const [resuming, setResuming] = useState(true);

    // A count already submitted earlier can't be re-entered: jump straight to its cuadre.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const state = await getShiftCloseState(activeShiftId);
                if (cancelled || !state.ok || !state.data.declared) return;
                const res = await getShiftClosePreview(activeShiftId);
                if (!cancelled && res.ok) setPreview(res.data);
            } finally {
                if (!cancelled) setResuming(false);
            }
        })();
        return () => { cancelled = true; };
    }, [activeShiftId]);

    const typed = { cash, card, transfer };

    /** Stage 1 → 2: fetch what was expected and show the comparison. */
    const handleReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (Object.values(typed).some((v) => isNaN(v) || v < 0)) { setError("Monto inválido"); return; }
        setLoading(true);
        try {
            const res = await getShiftClosePreview(activeShiftId, typed);
            if (!res.ok) { setError(res.error); return; }
            setPreview(res.data);
        } catch {
            setError("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    /** Stage 2 → 3: actually close the shift. */
    const handleConfirmClose = async () => {
        setError("");
        setLoading(true);
        try {
            const res = await closeShift(activeShiftId, note);
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
        const closingMessage = summary.userName
            ? `¡Buen turno, ${summary.userName.split(" ")[0]}!`
            : "¡Buen turno!";

        const rows = [
            { label: "Efectivo", icon: Banknote, ...{ expected: summary.expected, declared: summary.declared, difference: summary.difference } },
            { label: "Tarjeta", icon: CreditCard, ...summary.card },
            { label: "Transferencias", icon: ArrowRightLeft, ...summary.transfer },
        ];

        return createPortal(
            <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto p-4">
                <div className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-300 border border-border my-auto">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-1 mb-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-1">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">{closingMessage}</h2>
                        <Hint className="text-muted-foreground text-sm">Aquí está el resumen de tu turno.</Hint>
                    </div>

                    {/* Narrative stats — deliberately compact */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-muted/50 rounded-xl px-3 py-2 border border-border/50">
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                                <ShoppingBag className="w-3 h-3" /> Transacciones
                            </div>
                            <span className="text-base font-bold text-foreground">{summary.transactionCount}</span>
                        </div>
                        <div className="bg-muted/50 rounded-xl px-3 py-2 border border-border/50">
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                                <TrendingUp className="w-3 h-3" /> Total Ventas
                            </div>
                            <span className="text-base font-bold text-foreground">{money(summary.totalSales)}</span>
                        </div>
                        {summary.topProduct && (
                            <div className="bg-amber-500/10 rounded-xl px-3 py-2 border border-amber-500/20">
                                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
                                    <Trophy className="w-3 h-3" /> Producto estrella
                                </div>
                                <span className="text-sm font-semibold text-foreground leading-tight line-clamp-1">{summary.topProduct}</span>
                            </div>
                        )}
                        {summary.peakHour !== null && (
                            <div className="bg-primary/10 rounded-xl px-3 py-2 border border-primary/20">
                                <div className="flex items-center gap-1 text-primary text-[10px] font-semibold uppercase tracking-wider">
                                    <Clock className="w-3 h-3" /> Hora pico
                                </div>
                                <span className="text-sm font-semibold text-foreground">{formatHour(summary.peakHour)}</span>
                            </div>
                        )}
                    </div>
                    {summary.cancelledCount > 0 && (
                        <p className="text-xs text-muted-foreground text-center mb-3">{summary.cancelledCount} venta{summary.cancelledCount === 1 ? "" : "s"} anulada{summary.cancelledCount === 1 ? "" : "s"} (no cuentan en los totales).</p>
                    )}

                    {/* Reconciliation per method */}
                    <div className="mb-4 bg-muted/50 p-4 rounded-2xl border border-border/50">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-2 text-sm items-center">
                            <span />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Esperado</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Contado</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Diferencia</span>
                            {rows.map((r) => (
                                <Fragment key={r.label}>
                                    <span className="flex items-center gap-1.5 font-medium"><r.icon className="w-3.5 h-3.5 text-muted-foreground" />{r.label}</span>
                                    <span className="text-right">{money(r.expected)}</span>
                                    <span className="text-right font-semibold">{money(r.declared)}</span>
                                    <span className={`text-right font-bold ${diffColor(r.difference)}`}>{r.difference === 0 ? money(0) : signed(r.difference)}</span>
                                </Fragment>
                            ))}
                        </div>
                        <Hint className="text-[11px] text-muted-foreground mt-2">Efectivo esperado = ventas en efectivo (sin contar la base de {money(summary.baseAmount)}, que se queda en el cajón).</Hint>
                        {summary.note && (
                            <>
                                <Separator className="my-3" />
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Motivo del descuadre</p>
                                <p className="text-sm mt-0.5">{summary.note}</p>
                            </>
                        )}
                    </div>

                    <a
                        href={`/api/export/shift?id=${activeShiftId}`}
                        className="flex items-center justify-center gap-2 w-full h-10 mb-2 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                    >
                        Descargar ventas del turno (Excel .xlsx)
                    </a>
                    <Button
                        onClick={handleAcknowledge}
                        className="w-full h-11 rounded-2xl text-base font-bold shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Confirmar y Salir
                    </Button>
                </div>
            </div>,
            document.body
        );
    }

    if (resuming) return null;

    // ── Stage 2: reconciliation review ─────────────────────────────────────
    if (preview) {
        const rows = [
            { label: "Efectivo", icon: Banknote, expected: preview.expectedCash, declared: preview.declared.cash },
            { label: "Tarjeta", icon: CreditCard, expected: preview.cardSales, declared: preview.declared.card },
            { label: "Transferencias", icon: ArrowRightLeft, expected: preview.transferSales, declared: preview.declared.transfer },
        ].map((r) => ({ ...r, difference: r.declared - r.expected }));
        const mismatch = rows.some((r) => r.difference !== 0);

        return createPortal(
            <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto p-4">
                <div className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-300 border border-border my-auto">
                    <h2 className="text-xl font-bold tracking-tight text-center mb-1">Cuadre del turno</h2>
                    <Hint className="text-muted-foreground text-sm text-center mb-4">Compara lo que digitaste con lo que el sistema esperaba. El conteo ya quedó registrado y no se puede modificar.</Hint>

                    <div className="bg-muted/50 p-4 rounded-2xl border border-border/50 mb-4">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-2 text-sm items-center">
                            <span />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Esperado</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Digitado</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Diferencia</span>
                            {rows.map((r) => (
                                <Fragment key={r.label}>
                                    <span className="flex items-center gap-1.5 font-medium"><r.icon className="w-3.5 h-3.5 text-muted-foreground" />{r.label}</span>
                                    <span className="text-right">{money(r.expected)}</span>
                                    <span className="text-right font-semibold">{money(r.declared)}</span>
                                    <span className={`text-right font-bold ${diffColor(r.difference)}`}>{r.difference === 0 ? "OK" : signed(r.difference)}</span>
                                </Fragment>
                            ))}
                        </div>
                        <Hint className="text-[11px] text-muted-foreground mt-2">Efectivo esperado = ventas en efectivo ({money(preview.cashSales)}), sin contar la base de {money(preview.baseAmount)} (se queda en el cajón).</Hint>
                    </div>

                    {mismatch && (
                        <div className="space-y-1.5 mb-4">
                            <label htmlFor="closeNote" className="text-sm font-semibold ml-1 text-destructive">Motivo del descuadre (obligatorio)</label>
                            <textarea
                                id="closeNote"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                placeholder="Ej. Se dio un vuelto de más / falta un voucher del datáfono"
                                className="w-full rounded-2xl bg-muted/50 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20 mb-3">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1 h-12 rounded-2xl font-semibold">
                            Cerrar ventana
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmClose}
                            disabled={loading || (mismatch && !note.trim())}
                            className="flex-1 h-12 rounded-2xl font-semibold shadow-lg shadow-destructive/20 hover:-translate-y-0.5 transition-all"
                        >
                            {loading ? "Cerrando..." : "Confirmar cierre"}
                        </Button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // ── Stage 1: count form ───────────────────────────────────────────────
    const field = (id: string, label: string, value: number, set: (v: number) => void, icon: React.ReactNode) => (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-sm font-semibold text-foreground ml-1 flex items-center gap-1.5">{icon}{label}</label>
            <MoneyInput
                id={id}
                value={value}
                onChange={set}
                className="h-11 text-base rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors"
            />
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto p-4">
            <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-300 border border-border my-auto">
                <div className="flex flex-col items-center text-center space-y-1 mb-5">
                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-1">
                        <LogOut className="w-6 h-6 text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Cerrar Turno</h2>
                    <Hint className="text-muted-foreground text-sm">
                        Cuenta el efectivo que dejaron las ventas — aparte de la base con la que abriste, que se queda en el cajón — más las transferencias recibidas y el total del datáfono.
                    </Hint>
                </div>

                <form onSubmit={handleReview} className="space-y-4">
                    <div className="flex justify-between items-center rounded-2xl bg-muted/40 border border-border/50 px-4 py-3">
                        <span className="text-sm font-semibold text-muted-foreground">Base de apertura (no la cuentes aquí)</span>
                        <strong className="text-base">{money(baseAmount)}</strong>
                    </div>

                    {field("closeCash", "Efectivo de ventas (sin la base)", cash, (v) => { setCash(v); setCashTouched(true); }, <Banknote className="w-3.5 h-3.5 text-muted-foreground" />)}
                    {field("closeTransfer", "Transferencias", transfer, setTransfer, <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />)}
                    {field("closeCard", "Tarjeta / Datáfono", card, setCard, <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />)}

                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1 h-12 rounded-2xl font-semibold">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={loading || !cashTouched}
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
