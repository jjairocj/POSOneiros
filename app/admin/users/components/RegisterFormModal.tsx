"use client";

import { useState } from "react";
import { createRegister, updateRegister } from "@/app/actions/registers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import { MonitorSmartphone, Save, Loader2 } from "lucide-react";
import type { RegisterColumn } from "./register-columns";

interface RegisterFormModalProps {
    register?: RegisterColumn;
    branches: { id: string; name: string }[];
    trigger?: React.ReactNode;
}

export function RegisterFormModal({ register, branches, trigger }: RegisterFormModalProps) {
    const isEditing = !!register;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const form = e.currentTarget;
        const fd = new FormData(form);
        const data = {
            name: fd.get("name") as string,
            prefix: (fd.get("prefix") as string) || undefined,
            branchId: fd.get("branchId") as string,
        };

        try {
            const result = isEditing
                ? await updateRegister(register.id, data)
                : await createRegister(data);

            if (result.success) {
                setOpen(false);
            } else {
                setError(result.error || "Ocurrió un error inesperado.");
            }
        } catch (err: any) {
            setError(err.message || "Error de comunicación con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-primary text-primary-foreground font-bold px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm">
                        <MonitorSmartphone className="w-5 h-5 mr-2" />
                        Nueva Caja
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="max-w-[95vw] sm:max-w-[420px] max-h-[90vh] overflow-y-auto rounded-[2rem] p-4 sm:p-6 bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {isEditing ? "Editar Caja" : "Nueva Caja"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifica los datos de la caja registradora."
                            : "Registra una nueva caja registradora para una sucursal."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAction} className="space-y-4 mt-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm font-semibold p-3 rounded-xl border border-destructive/20">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Nombre de la caja</label>
                            <Input
                                name="name"
                                required
                                defaultValue={register?.name}
                                className="rounded-xl h-12 bg-muted/50"
                                placeholder="Ej: Caja Principal"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">
                                Prefijo de facturación{" "}
                                <span className="text-muted-foreground font-normal">(opcional)</span>
                            </label>
                            <Input
                                name="prefix"
                                defaultValue={register?.prefix || ""}
                                className="rounded-xl h-12 bg-muted/50 font-mono"
                                placeholder="Ej: FAC-001"
                                maxLength={10}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Sucursal</label>
                            <select
                                name="branchId"
                                required
                                defaultValue={register?.branch?.id || ""}
                                className="w-full rounded-xl h-12 bg-muted/50 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="" disabled>Seleccionar sucursal</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1 rounded-xl h-12 font-bold"
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 rounded-xl h-12 font-bold shadow-lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    {isEditing ? "Guardar Cambios" : "Crear Caja"}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
