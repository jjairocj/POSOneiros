"use client";
import { useState } from "react";
import ShiftClosingModal from "./ShiftClosingModal";
import ShiftOpeningModal from "./ShiftOpeningModal";
import { Button } from "@/components/ui/button";
import { LogOut, MonitorPlay } from "lucide-react";

export default function ShiftHeader({ activeShift }: { activeShift: any }) {
    const [isClosingInfo, setIsClosingInfo] = useState(false);
    const [isOpeningInfo, setIsOpeningInfo] = useState(false);

    if (!activeShift) return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-black tracking-tight">Oneiros POS</h1>
                <div className="flex items-center px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    Sin turno activo
                </div>
            </div>
            <Button 
                variant="default" 
                size="sm"
                onClick={() => setIsOpeningInfo(true)}
                className="font-semibold shadow-sm hover:-translate-y-0.5 transition-transform"
            >
                <MonitorPlay className="w-4 h-4 mr-2" />
                Abrir Turno
            </Button>
            
            {isOpeningInfo && <ShiftOpeningModal onClose={() => setIsOpeningInfo(false)} />}
        </div>
    );

    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-black tracking-tight">Oneiros POS</h1>
                <div className="flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                    Turno: {activeShift.register?.name || 'Caja Fija'}
                </div>
            </div>
            <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setIsClosingInfo(true)}
                className="font-semibold shadow-sm hover:-translate-y-0.5 transition-transform"
            >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Turno
            </Button>
            
            {isClosingInfo && (
                <ShiftClosingModal 
                    activeShiftId={activeShift.id} 
                    onCancel={() => setIsClosingInfo(false)} 
                />
            )}
        </div>
    );
}
