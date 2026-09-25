"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, Pencil, Power, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSupplierActive, deleteSupplier, type SupplierRow } from "@/app/actions/suppliers";
import { SupplierForm } from "./SupplierForm";

/** Two-tap delete: only offered when the supplier has never been used on a
 * lot (canDelete) — otherwise the toggle active/inactive is the safe path. */
function DeleteSupplierButton({ supplier }: { supplier: SupplierRow }) {
    const router = useRouter();
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
            const res = await deleteSupplier(supplier.id);
            if (!res.ok) { toast.error(res.error); return; }
            toast.success(`Proveedor "${supplier.name}" eliminado.`);
            router.refresh();
        } finally {
            setLoading(false);
            setConfirming(false);
        }
    };

    return (
        <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handle}
            disabled={loading}
            className={`h-8 text-xs ${confirming ? "text-destructive hover:text-destructive" : ""}`}
        >
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
            {confirming ? "¿Seguro?" : "Eliminar"}
        </Button>
    );
}

export function SuppliersTable({ suppliers }: { suppliers: SupplierRow[] }) {
    const router = useRouter();

    const toggle = async (s: SupplierRow) => {
        const res = await toggleSupplierActive(s.id, !s.isActive);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(s.isActive ? `"${s.name}" desactivado.` : `"${s.name}" reactivado.`);
        router.refresh();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <SupplierForm />
            </div>

            {suppliers.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sin proveedores registrados todavía.</p>
            ) : (
                <ul className="space-y-3">
                    {suppliers.map((s) => (
                        <li key={s.id} className={`bg-card border border-border rounded-2xl p-4 ${!s.isActive ? "opacity-60" : ""}`}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Truck className="w-4 h-4 text-primary shrink-0" />
                                    <div className="min-w-0">
                                        <span className="font-semibold truncate block">{s.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {[s.taxId, s.phone, s.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {!s.isActive && (
                                        <span className="text-xs bg-muted text-muted-foreground font-semibold px-2.5 py-1 rounded-full">Inactivo</span>
                                    )}
                                    <SupplierForm supplier={s} trigger={
                                        <Button size="sm" variant="outline" className="h-8 text-xs">
                                            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                                        </Button>
                                    } />
                                    <Button size="sm" variant="ghost" onClick={() => toggle(s)} className="h-8 text-xs">
                                        <Power className="w-3.5 h-3.5 mr-1" /> {s.isActive ? "Desactivar" : "Reactivar"}
                                    </Button>
                                    {s.canDelete && <DeleteSupplierButton supplier={s} />}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
