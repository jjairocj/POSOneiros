"use client";
import { useState } from "react";
import ShiftClosingModal from "./ShiftClosingModal";
import ShiftOpeningModal from "./ShiftOpeningModal";
import { Button } from "@/components/ui/button";
import { LogOut, MonitorPlay, ShoppingBag } from "lucide-react";
import POSUserMenu from "../POSUserMenu";

interface ShiftHeaderProps {
  activeShift: any;
  userName: string;
  userRole: string;
}

export default function ShiftHeader({ activeShift, userName, userRole }: ShiftHeaderProps) {
    const [isClosingInfo, setIsClosingInfo] = useState(false);
    const [isOpeningInfo, setIsOpeningInfo] = useState(false);

    return (
        <div className="flex items-center justify-between w-full gap-3">
            {/* Left: brand + shift status */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <h1 className="hidden sm:block text-xl font-black tracking-tight shrink-0 text-foreground">
                    Oneiros POS
                </h1>

                {!activeShift ? (
                    <span className="flex items-center px-2.5 py-1 rounded-full bg-destructive/20 border border-destructive/30 text-destructive text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                        Sin turno activo
                    </span>
                ) : (
                    <>
                        <span className="flex items-center px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            <span className="hidden sm:inline">Turno:&nbsp;</span>
                            {activeShift.register?.name || "Caja Fija"}
                        </span>
                        <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] sm:text-xs font-bold whitespace-nowrap">
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
                        onClick={() => setIsClosingInfo(true)}
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
            {isClosingInfo && activeShift && (
                <ShiftClosingModal
                    activeShiftId={activeShift.id}
                    onCancel={() => setIsClosingInfo(false)}
                />
            )}
        </div>
    );
}
