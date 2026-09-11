"use client";
import { useState } from "react";
import ShiftClosingModal from "./ShiftClosingModal";
import ShiftOpeningModal from "./ShiftOpeningModal";
import { Button } from "@/components/ui/button";
import { LogOut, MonitorPlay, ShoppingBag } from "lucide-react";
import POSUserMenu from "../POSUserMenu";

/** Only what the header needs; the page passes the full Prisma shift. */
type ActiveShift = { id: string; register?: { name: string } | null; _count?: { sales: number } } | null;

interface ShiftHeaderProps {
  activeShift: ActiveShift;
  userName: string;
  userRole: string;
}

export default function ShiftHeader({ activeShift, userName, userRole }: ShiftHeaderProps) {
    // Keep the id in state: after closeShift revalidates /pos, activeShift becomes null
    // and the summary modal must stay mounted until the cashier acknowledges it.
    const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
    const [isOpeningInfo, setIsOpeningInfo] = useState(false);

    return (
        <div className="flex items-center justify-between w-full gap-3">
            {/* Left: brand + shift status */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <h1 className="hidden sm:block text-xl font-black tracking-tight shrink-0 text-foreground">
                    Oneiros POS
                </h1>

                {/*
                  Badge colors are hardcoded Tailwind shades (not the `destructive`/`primary`
                  design tokens) chosen specifically so text-on-tinted-background clears WCAG AA
                  (4.5:1) at the tint's exact opacity — verified numerically, not eyeballed, per
                  NN/g's glassmorphism guidance (nngroup.com/articles/glassmorphism) that flags
                  translucent badges as the highest-risk contrast pattern. Don't restyle these
                  with a semantic token without re-checking contrast at the new opacity.
                */}
                {!activeShift ? (
                    <span className="flex items-center px-2.5 py-1 rounded-full bg-red-500/12 border border-red-500/30 text-red-700 dark:text-red-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                        Sin turno activo
                    </span>
                ) : (
                    <>
                        <span className="flex items-center px-2.5 py-1 rounded-full bg-primary/12 border border-primary/30 text-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            <span className="hidden sm:inline">Turno:&nbsp;</span>
                            {activeShift.register?.name || "Caja Fija"}
                        </span>
                        <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                            <ShoppingBag className="w-3 h-3" />
                            {(activeShift._count?.sales ?? 0)}{" "}
                            {(activeShift._count?.sales ?? 0) === 1 ? "venta" : "ventas"}
                        </span>
                    </>
                )}
            </div>

            {/* Right: shift action + user menu */}
            <div className="flex items-center gap-2 shrink-0">
                {!activeShift ? (
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsOpeningInfo(true)}
                        className="font-semibold hover:-translate-y-0.5 transition-transform"
                    >
                        <MonitorPlay className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Abrir Turno</span>
                        <span className="sm:hidden">Abrir</span>
                    </Button>
                ) : (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setClosingShiftId(activeShift.id)}
                        className="font-semibold hover:-translate-y-0.5 transition-transform"
                    >
                        <LogOut className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Cerrar Turno</span>
                        <span className="sm:hidden">Cerrar</span>
                    </Button>
                )}

                <POSUserMenu userName={userName} userRole={userRole} />
            </div>

            {isOpeningInfo && <ShiftOpeningModal onClose={() => setIsOpeningInfo(false)} />}
            {closingShiftId && (
                <ShiftClosingModal
                    activeShiftId={closingShiftId}
                    onCancel={() => setClosingShiftId(null)}
                />
            )}
        </div>
    );
}
