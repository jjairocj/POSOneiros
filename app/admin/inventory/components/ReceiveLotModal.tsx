"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { PackagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { receiveProductLot } from "@/app/actions/lots";

/** Health-authority traceability: every delivery of a LOT-tracked product
 * gets its own lot number and optional expiration date (see docs/16). */
export function ReceiveLotModal({ product, onClose }: { product: { id: string; name: string; stock: number }; onClose: () => void }) {
    const router = useRouter();
    const [lotNumber, setLotNumber] = useState("");
    const [expirationDate, setExpirationDate] = useState("");
    const [quantity, setQuantity] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await receiveProductLot({
                productId: product.id,
                lotNumber: lotNumber.trim() || undefined,
                expirationDate: expirationDate || null,
                quantity: Number(quantity),
            });
            if (!res.ok) { setError(res.error); return; }
            toast.success(`Lote registrado para "${product.name}".`);
            router.refresh();
            onClose();
        } catch {
            setError("No se pudo conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <form onSubmit={submit} className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl p-7 border border-border relative animate-in zoom-in-95 duration-200 space-y-4">
                <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-5 right-5 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted p-2 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                </button>
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2"><PackagePlus className="w-5 h-5 text-primary" /> Recibir lote</h2>
                    <p className="text-sm text-muted-foreground">{product.name} · stock actual <strong className="text-foreground">{product.stock}</strong></p>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="lot-number" className="text-sm font-semibold ml-1">Número de lote</label>
                    <Input id="lot-number" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Como viene impreso en el empaque" className="h-11 rounded-xl bg-muted/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label htmlFor="lot-exp" className="text-sm font-semibold ml-1">Vencimiento <span className="font-normal text-muted-foreground">(opcional)</span></label>
                        <Input id="lot-exp" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className="h-11 rounded-xl bg-muted/50" />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="lot-qty" className="text-sm font-semibold ml-1">Cantidad recibida</label>
                        <Input id="lot-qty" type="number" min="0" step="any" inputMode="decimal" required autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11 rounded-xl bg-muted/50" />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground ml-1">Ej: una caja con 8 bolsas x 4 sobres = 32 unidades, un solo lote/vencimiento para toda la entrega.</p>

                {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">{error}</p>}
                <Button type="submit" disabled={loading || quantity === ""} className="w-full h-11 rounded-xl font-bold">
                    {loading ? "Guardando…" : "Registrar lote"}
                </Button>
            </form>
        </div>,
        document.body
    );
}
