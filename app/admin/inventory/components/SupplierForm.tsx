"use client";

import { useState } from "react";
import { createSupplier, updateSupplier, type SupplierRow } from "@/app/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Truck, Save, Loader2 } from "lucide-react";

interface SupplierFormProps {
    supplier?: SupplierRow;
    trigger?: React.ReactNode;
}

export function SupplierForm({ supplier, trigger }: SupplierFormProps) {
    const isEditing = !!supplier;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAction = async (formData: FormData) => {
        setLoading(true);
        setError("");
        try {
            const result = isEditing
                ? await updateSupplier(supplier.id, formData)
                : await createSupplier(formData);
            if (result.ok) {
                setOpen(false);
            } else {
                setError(result.error || "Ocurrió un error inesperado.");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error de comunicación con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-secondary text-secondary-foreground font-bold px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 transition-all text-sm">
                        <Truck className="w-5 h-5 mr-2" />
                        Nuevo Proveedor
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[440px] rounded-[2rem] p-6 bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
                    </DialogTitle>
                    <DialogDescription>
                        Datos de contacto para saber a quién le compraste cada lote.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleAction} className="space-y-4 mt-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm font-semibold p-3 rounded-xl border border-destructive/20">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Nombre</label>
                            <Input name="name" required defaultValue={supplier?.name} className="rounded-xl h-12 bg-muted/50 font-bold" placeholder="Ej: Distribuidora Andina S.A.S." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">NIT</label>
                                <Input name="taxId" defaultValue={supplier?.taxId ?? ""} className="rounded-xl h-11 bg-muted/50" placeholder="900123456-7" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">Teléfono</label>
                                <Input name="phone" defaultValue={supplier?.phone ?? ""} className="rounded-xl h-11 bg-muted/50" placeholder="+57 300 000 0000" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Email</label>
                            <Input name="email" type="email" defaultValue={supplier?.email ?? ""} className="rounded-xl h-11 bg-muted/50" placeholder="contacto@proveedor.com" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Dirección</label>
                            <Input name="address" defaultValue={supplier?.address ?? ""} className="rounded-xl h-11 bg-muted/50" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Notas</label>
                            <Input name="notes" defaultValue={supplier?.notes ?? ""} className="rounded-xl h-11 bg-muted/50" placeholder="Opcional" />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl h-12 font-bold" disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold shadow-lg" disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Save className="w-5 h-5 mr-2" />{isEditing ? "Guardar" : "Crear"}</>)}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
