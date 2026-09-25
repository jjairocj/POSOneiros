"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/actions/product";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

/** Two-tap delete: first tap asks (button turns red and re-labels itself),
 * second tap within a few seconds confirms. Resets on its own if ignored. */
export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

    const handle = async () => {
        if (!confirming) {
            setConfirming(true);
            resetTimer.current = setTimeout(() => setConfirming(false), 4000);
            return;
        }
        if (resetTimer.current) clearTimeout(resetTimer.current);
        setLoading(true);
        try {
            const res = await deleteProduct(productId);
            if (res.success) toast.success(`"${productName}" eliminado. Si tenía ventas, quedó desactivado para conservar el historial.`);
            else toast.error(res.error || "No se pudo eliminar.");
        } catch {
            toast.error("No se pudo conectar con el servidor.");
        } finally {
            setLoading(false);
            setConfirming(false);
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-lg ${confirming ? "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
            title={confirming ? "¿Seguro? Toca de nuevo para eliminar" : "Eliminar producto"}
            onClick={handle}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="sr-only">{confirming ? "¿Seguro? Toca de nuevo para eliminar" : "Eliminar producto"}</span>
        </Button>
    );
}
