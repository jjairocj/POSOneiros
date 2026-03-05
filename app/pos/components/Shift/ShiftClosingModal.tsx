"use client";

import { useState } from "react";
import { closeShift } from "@/app/actions/shift";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function ShiftClosingModal({ activeShiftId, onCancel }: { activeShiftId: string, onCancel: () => void }) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [summary, setSummary] = useState<any>(null);
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
            setSummary(res.summary);
            // Don't auto-refresh yet, let user see the Z-Report summary
        } catch (err: any) {
            setError(err.message || "Error al cerrar turno");
            setLoading(false);
        }
    };

    const handleAcknowledge = () => {
        // Force refresh to trigger ShiftGuard (which will demand a new shift)
        router.refresh();
        window.location.reload();
    };

    if (summary) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-border">
                    <div className="flex flex-col items-center text-center space-y-2 mb-6">
                        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-2">
                            <Receipt className="w-8 h-8 text-success" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Reporte de Cierre Z</h2>
                        <p className="text-muted-foreground text-sm">Resumen del cuadre de caja.</p>
                    </div>

                    <div className="space-y-4 mb-8 bg-muted/50 p-6 rounded-2xl border border-border/50">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Total Ventas:</span>
                            <strong className="text-lg">${summary.totalSales.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Esperado en Caja:</span>
                            <strong className="text-lg">${summary.expected.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Monto Declarado:</span>
                            <strong className="text-lg">${summary.declared.toLocaleString()}</strong>
                        </div>
                        
                        <Separator className="my-2" />
                        
                        <div className={`flex justify-between items-center pt-2 ${
                                summary.difference < 0 ? 'text-destructive' : 
                                (summary.difference > 0 ? 'text-success' : 'text-foreground')
                            }`}>
                            <span className="font-semibold flex items-center gap-2">
                                Diferencia (Descuadre):
                            </span>
                            <strong className="text-xl">${summary.difference.toLocaleString()}</strong>
                        </div>
                    </div>
                    
                    <Button 
                        onClick={handleAcknowledge}
                        className="w-full h-12 rounded-2xl text-base font-bold shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Confirmar y Salir
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-border">
                <div className="flex flex-col items-center text-center space-y-2 mb-8">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                        <LogOut className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Cerrar Turno</h2>
                    <p className="text-muted-foreground text-sm">
                        Ingresa el dinero total en caja para realizar el arqueo.
                    </p>
                </div>
                
                <form onSubmit={handleCloseShift} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="closeAmount" className="text-sm font-semibold text-foreground ml-1">Monto Total en Caja ($)</label>
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
        </div>
    );
}
