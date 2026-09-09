"use client";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { deleteProduct } from "@/app/actions/product";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/** Two-tap delete inside the row menu: first tap asks, second confirms. */
export function DeleteProductItem({ productId, productName }: { productId: string; productName: string }) {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);

    const handle = async (e: Event) => {
        e.preventDefault();
        if (!confirming) { setConfirming(true); return; }
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
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={handle} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {confirming ? "¿Seguro? Toca de nuevo para eliminar" : "Eliminar producto"}
        </DropdownMenuItem>
    );
}
