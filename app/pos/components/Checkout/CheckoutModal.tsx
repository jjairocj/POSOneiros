"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, X, Banknote, CreditCard, ArrowRightLeft } from "lucide-react";
import { processSale } from "../../../actions/sale";

export default function CheckoutModal({
    activeShiftId,
    orderTotal,
    items,
    onSuccess,
    onCancel
}: {
    activeShiftId: string;
    orderTotal: number;
    items: any[];
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [cash, setCash] = useState("");
    const [card, setCard] = useState("");
    const [transfer, setTransfer] = useState("");
    const [error, setError] = useState("");

    const cashAmount = parseFloat(cash) || 0;
    const cardAmount = parseFloat(card) || 0;
    const transferAmount = parseFloat(transfer) || 0;

    const totalPaid = cashAmount + cardAmount + transferAmount;
    const remaining = Math.max(0, orderTotal - totalPaid);
    const change = Math.max(0, totalPaid - orderTotal);

    // If card or transfer alone exceeds total, and no cash, that's not typical unless overpaying card intentionally, 
    // usually change is only given for cash.

    const canSubmit = totalPaid >= orderTotal && items.length > 0;

    const handleCheckout = async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError("");

        try {
            // Distribute amounts for the backend exactness
            // If they paid 20k cash for a 15k bill, we only register 15k cash for the sale revenue.
            
            let amountToCover = orderTotal;
            const payments = [];

            // Prioritize non-cash for covering the bill exactness, cash covers the rest
            if (cardAmount > 0) {
                const applied = Math.min(amountToCover, cardAmount);
                payments.push({ method: "CARD", amount: applied });
                amountToCover -= applied;
            }
            if (transferAmount > 0) {
                const applied = Math.min(amountToCover, transferAmount);
                payments.push({ method: "TRANSFER", amount: applied });
                amountToCover -= applied;
            }
            if (cashAmount > 0 && amountToCover > 0) {
                payments.push({ method: "CASH", amount: amountToCover });
            }

            await processSale(activeShiftId, items, payments);
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Error procesando el pago");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-border flex flex-col max-h-[90vh]">
                
                <div className="bg-primary/5 p-6 border-b border-border/50 relative flex flex-col items-center">
                    <button 
                        onClick={onCancel} 
                        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors bg-background hover:bg-muted p-2 rounded-full shadow-sm border border-border"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                        <Receipt className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Checkout</h2>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        Total a cobrar: <span className="text-foreground text-xl font-bold ml-1">${orderTotal.toLocaleString()}</span>
                    </p>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Payment Methods */}
                    <div className="space-y-4">
                        <div className="bg-accent/30 p-4 rounded-3xl border border-border">
                            <label className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground">
                                <Banknote className="w-5 h-5 text-green-600 dark:text-green-500" />
                                Efectivo
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                                <Input 
                                    type="number" 
                                    value={cash} 
                                    onChange={(e) => setCash(e.target.value)}
                                    placeholder="0"
                                    className="pl-8 h-12 text-lg rounded-2xl bg-background border-transparent shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="bg-accent/30 p-4 rounded-3xl border border-border">
                            <label className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground">
                                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                                Tarjeta / Datáfono
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                                <Input 
                                    type="number" 
                                    value={card} 
                                    onChange={(e) => setCard(e.target.value)}
                                    placeholder="0"
                                    className="pl-8 h-12 text-lg rounded-2xl bg-background border-transparent shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="bg-accent/30 p-4 rounded-3xl border border-border">
                            <label className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground">
                                <ArrowRightLeft className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                                Transferencia (Nequi/Daviplata/Bancolombia)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                                <Input 
                                    type="number" 
                                    value={transfer} 
                                    onChange={(e) => setTransfer(e.target.value)}
                                    placeholder="0"
                                    className="pl-8 h-12 text-lg rounded-2xl bg-background border-transparent shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Totals */}
                <div className="p-6 bg-muted/30 border-t border-border mt-auto">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-background p-4 rounded-2xl border border-border shadow-sm flex flex-col justify-center items-center">
                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Restante</span>
                            <span className={`text-xl font-black ${remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                                ${remaining.toLocaleString()}
                            </span>
                        </div>
                        <div className="bg-background p-4 rounded-2xl border border-border shadow-sm flex flex-col justify-center items-center">
                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Vuelto / Cambio</span>
                            <span className="text-xl font-black text-primary">
                                ${change.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    
                    <Button 
                        onClick={handleCheckout} 
                        disabled={loading || !canSubmit}
                        className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all"
                    >
                        {loading ? "PROCESANDO..." : "FINALIZAR VENTA"}
                    </Button>
                </div>

            </div>
        </div>
    );
}
