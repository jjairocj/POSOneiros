"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, MonitorPlay } from "lucide-react";
import { startOfMonth } from "date-fns";
import { businessDayKey } from "@/app/lib/time";
import { Button } from "@/components/ui/button";
import type { OpenShiftSummary } from "@/app/actions/shift";

interface SalesFiltersProps {
    from: string;
    to: string;
    /** Set when the page is currently scoped to one live shift instead of a date range. */
    activeShiftId?: string;
    openShifts?: OpenShiftSummary[];
    /** Page this filter bar navigates within — defaults to Ventas e Ingresos. */
    basePath?: string;
}

const fmtShiftStart = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Date-range + "live shift" filter bar for Ventas e Ingresos. Both analytics
 * and the ticket history read the same `from`/`to`/`shift` query params
 * server-side (page.tsx), so this just navigates — no client fetching here. */
export function SalesFilters({ from, to, activeShiftId, openShifts = [], basePath = "/admin/sales" }: SalesFiltersProps) {
    const router = useRouter();
    const [draftFrom, setDraftFrom] = useState(from);
    const [draftTo, setDraftTo] = useState(to);

    const applyRange = (f: string, t: string) => {
        router.push(`${basePath}?from=${f}&to=${t}`);
    };

    const viewShift = (id: string) => {
        router.push(`${basePath}?shift=${id}`);
    };

    return (
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground shrink-0">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                Rango de fechas
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="date"
                    value={draftFrom}
                    onChange={(e) => setDraftFrom(e.target.value)}
                    className="h-10 rounded-xl bg-muted/50 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-muted-foreground text-sm">a</span>
                <input
                    type="date"
                    value={draftTo}
                    onChange={(e) => setDraftTo(e.target.value)}
                    className="h-10 rounded-xl bg-muted/50 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button
                    type="button"
                    size="sm"
                    variant={!activeShiftId ? "default" : "outline"}
                    onClick={() => applyRange(draftFrom, draftTo)}
                    className="h-10 rounded-xl"
                >
                    Ver rango
                </Button>
                <span className="w-px h-6 bg-border mx-1 hidden sm:block" />
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { const t = businessDayKey(new Date()); setDraftFrom(t); setDraftTo(t); applyRange(t, t); }}
                    className="h-10 rounded-xl text-xs"
                >
                    Hoy
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { const f = businessDayKey(startOfMonth(new Date())); const t = businessDayKey(new Date()); setDraftFrom(f); setDraftTo(t); applyRange(f, t); }}
                    className="h-10 rounded-xl text-xs"
                >
                    Este mes
                </Button>
            </div>

            <div className="flex-1" />

            {openShifts.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <MonitorPlay className="w-4 h-4" /> Turnos abiertos ahora:
                    </div>
                    {openShifts.map((s) => (
                        <Button
                            key={s.id}
                            type="button"
                            size="sm"
                            variant={activeShiftId === s.id ? "default" : "outline"}
                            onClick={() => viewShift(s.id)}
                            className="h-10 rounded-xl text-xs"
                            title={`${s.registerName} · ${s.userName} · desde ${fmtShiftStart(s.startTime)}`}
                        >
                            {s.registerName} · {s.userName}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
