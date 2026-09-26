"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import { getOpenShifts, type OpenShiftSummary } from "@/app/actions/shift";
import ShiftClosingModal from "./ShiftClosingModal";

/**
 * Shown instead of "Sin turno activo" when the viewer (ADMIN/SUPERVISOR with
 * VIEW_REPORTS) has no shift of their own but someone else's is still open —
 * a shift is tied to whoever opened it (see getActiveShift), so without this
 * an admin logging in elsewhere had no way to even know one was running.
 * Closing reuses ShiftClosingModal as-is: closeShift() already lets a
 * SUPERVISOR/ADMIN close a shift they didn't open (loadShiftForClose in
 * app/actions/shift.ts).
 */
export default function OpenShiftsNotice() {
    const [shifts, setShifts] = useState<OpenShiftSummary[] | null>(null);
    const [showList, setShowList] = useState(false);
    const [closingId, setClosingId] = useState<string | null>(null);
    const [closingBase, setClosingBase] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getOpenShifts().then((list) => { if (!cancelled) setShifts(list); });
        return () => { cancelled = true; };
    }, []);

    if (!shifts || shifts.length === 0) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setShowList(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/12 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap hover:bg-amber-500/20 active:scale-95 transition-all"
            >
                <AlertTriangle className="w-3 h-3" />
                {shifts.length === 1 ? "1 turno abierto" : `${shifts.length} turnos abiertos`}
            </button>

            <Dialog open={showList} onOpenChange={setShowList}>
                <DialogContent className="max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Turnos abiertos por otros usuarios</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        {shifts.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{s.userName}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {s.registerName} · desde {new Date(s.startTime).toLocaleString("es-CO", {
                                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="rounded-xl gap-1.5 shrink-0"
                                    onClick={() => { setClosingBase(s.baseAmount); setClosingId(s.id); setShowList(false); }}
                                >
                                    <LogOut className="w-3.5 h-3.5" /> Cerrar
                                </Button>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {closingId && (
                <ShiftClosingModal
                    activeShiftId={closingId}
                    baseAmount={closingBase}
                    onCancel={() => setClosingId(null)}
                />
            )}
        </>
    );
}
