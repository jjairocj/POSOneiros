"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Ban, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/app/lib/money";

const REASONS = ["Error de digitación", "Cliente se arrepintió", "Producto en mal estado", "Cobro duplicado"];

export function CancelSaleDialog({
    saleLabel, total, loading, onConfirm, onClose,
}: {
    saleLabel: string;
    total: number;
    loading: boolean;
    onConfirm: (reason: string) => void;
    onClose: () => void;
}) {
    const [reason, setReason] = useState("");

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl p-7 border border-border relative animate-in zoom-in-95 duration-200">
                <button onClick={onClose} aria-label="Cerrar" className="absolute top-5 right-5 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted p-2 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center text-center gap-2 mb-5">
                    <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center">
                        <Ban className="w-7 h-7 text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold">Anular venta {saleLabel}</h2>
                    <p className="text-sm text-muted-foreground">
                        Se devolverá el stock de todos los productos y la venta de {formatMoney(total)} dejará de contar en los reportes. La venta queda en el historial marcada como anulada.
                    </p>
                </div>

                <label className="text-sm font-semibold ml-1">Motivo</label>
                <div className="flex flex-wrap gap-2 my-2">
                    {REASONS.map((r) => (
                        <button key={r} type="button" onClick={() => setReason(r)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${reason === r ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-muted/40 hover:border-destructive/50"}`}>
                            {r}
                        </button>
                    ))}
                </div>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Escribe o elige un motivo…"
                    rows={2}
                    className="w-full rounded-2xl bg-muted/50 border border-border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/40"
                />

                <div className="flex gap-3 mt-5">
                    <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={onClose} disabled={loading}>Volver</Button>
                    <Button variant="destructive" className="flex-1 rounded-xl h-11 font-bold" disabled={loading || reason.trim().length < 3} onClick={() => onConfirm(reason)}>
                        {loading ? "Anulando…" : "Anular venta"}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
