"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { PackagePlus, PackageMinus, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustStock, type MovementType } from "@/app/actions/product";

const TYPES: { value: MovementType; label: string; hint: string; icon: React.ReactNode }[] = [
    { value: "PURCHASE", label: "Entrada", hint: "Compra o reposición: suma unidades.", icon: <PackagePlus className="w-4 h-4" /> },
    { value: "WASTE", label: "Merma", hint: "Vencido, dañado o regalado: resta unidades.", icon: <PackageMinus className="w-4 h-4" /> },
    { value: "ADJUSTMENT", label: "Ajuste", hint: "Corrección tras conteo: usa negativo para restar.", icon: <SlidersHorizontal className="w-4 h-4" /> },
];

export function StockMovementModal({ product, onClose }: { product: { id: string; name: string; stock: number; cost: number }; onClose: () => void }) {
    const router = useRouter();
    const [type, setType] = useState<MovementType>("PURCHASE");
    const [quantity, setQuantity] = useState("");
    const [unitCost, setUnitCost] = useState(String(product.cost || ""));
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const qty = Number(quantity);
    const preview = Number.isFinite(qty) ? product.stock + (type === "WASTE" ? -Math.abs(qty) : qty) : product.stock;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await adjustStock({
                productId: product.id, type, quantity: qty, reason,
                unitCost: type === "PURCHASE" && unitCost !== "" ? Number(unitCost) : undefined,
            });
            if (!res.success) { setError(res.error ?? "No se pudo registrar."); return; }
            toast.success(`Movimiento registrado. Stock de "${product.name}": ${preview}.`);
            router.refresh();
            onClose();
        } catch {
            setError("No se pudo conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    const current = TYPES.find((t) => t.value === type)!;
    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <form onSubmit={submit} className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl p-7 border border-border relative animate-in zoom-in-95 duration-200 space-y-4">
                <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-5 right-5 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted p-2 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                </button>
                <div>
                    <h2 className="text-xl font-bold">Movimiento de inventario</h2>
                    <p className="text-sm text-muted-foreground">{product.name} · stock actual <strong className="text-foreground">{product.stock}</strong></p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {TYPES.map((t) => (
                        <button key={t.value} type="button" onClick={() => setType(t.value)}
                            className={`flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-bold transition-colors ${type === t.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 hover:border-primary/50"}`}>
                            {t.icon}{t.label}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground -mt-2 ml-1">{current.hint}</p>

                <div className={`grid gap-3 ${type === "PURCHASE" ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div className="space-y-1.5">
                        <label htmlFor="mv-qty" className="text-sm font-semibold ml-1">Cantidad</label>
                        <Input id="mv-qty" type="number" step="any" inputMode="decimal" required autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11 rounded-xl bg-muted/50" />
                    </div>
                    {type === "PURCHASE" && (
                        <div className="space-y-1.5">
                            <label htmlFor="mv-cost" className="text-sm font-semibold ml-1">Costo unitario</label>
                            <Input id="mv-cost" type="number" min="0" step="1" inputMode="numeric" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="h-11 rounded-xl bg-muted/50" />
                        </div>
                    )}
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="mv-reason" className="text-sm font-semibold ml-1">Motivo {type === "PURCHASE" ? "(opcional)" : ""}</label>
                    <Input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === "PURCHASE" ? "Proveedor, factura…" : "Vencido, conteo físico…"} className="h-11 rounded-xl bg-muted/50" />
                </div>

                <div className="flex justify-between items-center text-sm bg-muted/40 rounded-xl px-4 py-2.5 border border-border/50">
                    <span className="text-muted-foreground">Stock después</span>
                    <strong className={preview < 0 ? "text-destructive" : ""}>{preview}</strong>
                </div>
                {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">{error}</p>}
                <Button type="submit" disabled={loading || quantity === ""} className="w-full h-11 rounded-xl font-bold">
                    {loading ? "Guardando…" : "Registrar movimiento"}
                </Button>
            </form>
        </div>,
        document.body
    );
}
