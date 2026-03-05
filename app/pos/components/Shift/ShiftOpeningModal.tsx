"use client";

import { useState } from "react";
import { openShift } from "../../../actions/shift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, X } from "lucide-react";

export default function ShiftOpeningModal({ onClose }: { onClose?: () => void }) {
  const [baseAmount, setBaseAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // In a real app, we'd fetch registers for the branch. 
  // For now, we use the one created in seed.
  const registerId = "caja-1"; 

  const handleOpenShift = async () => {
    const amount = Number(baseAmount);
    setLoading(true);
    try {
      await openShift(amount, registerId);
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      alert("Error al abrir turno");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-border relative">
        {onClose && (
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors bg-muted/50 hover:bg-muted p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col items-center text-center space-y-2 mb-8 mt-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Apertura de Turno</h2>
            <p className="text-muted-foreground text-sm">
                Ingresa el monto base en caja para iniciar tu sesión de ventas.
            </p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground ml-1">Monto Base (Efectivo)</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input 
                    type="number" 
                    value={baseAmount} 
                    onChange={(e) => setBaseAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 h-12 text-lg rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors"
                />
            </div>
          </div>

          <Button 
            onClick={handleOpenShift} 
            disabled={loading || baseAmount === ""}
            className="w-full h-12 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            {loading ? "Abriendo Turno..." : "Abrir Turno"}
          </Button>
        </div>
      </div>
    </div>
  );
}
