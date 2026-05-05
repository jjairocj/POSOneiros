"use client";

import { useState } from "react";
import { createUser, updateUser } from "@/app/actions/users";
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
import { UserPlus, Save, Loader2 } from "lucide-react";
import type { UserColumn } from "./user-columns";

interface UserFormModalProps {
    user?: UserColumn;
    roles: { id: string; name: string }[];
    branches: { id: string; name: string }[];
    trigger?: React.ReactNode;
}

export function UserFormModal({ user, roles, branches, trigger }: UserFormModalProps) {
    const isEditing = !!user;
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
            email: fd.get("email") as string,
            password: fd.get("password") as string,
            roleId: fd.get("roleId") as string,
            branchId: fd.get("branchId") as string || undefined,
        };

        try {
            const result = isEditing
                ? await updateUser(user.id, data)
                : await createUser(data);

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
                        <UserPlus className="w-5 h-5 mr-2" />
                        Nuevo Usuario
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="max-w-[95vw] sm:max-w-[460px] max-h-[90vh] overflow-y-auto rounded-[2rem] p-4 sm:p-6 bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifica los datos del usuario. Deja la contraseña vacía para no cambiarla."
                            : "Completa los datos para crear un nuevo usuario del sistema."}
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
                            <label className="text-sm font-semibold ml-1">Nombre completo</label>
                            <Input
                                name="name"
                                required
                                defaultValue={user?.name}
                                className="rounded-xl h-12 bg-muted/50"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Correo electrónico</label>
                            <Input
                                name="email"
                                type="email"
                                required
                                defaultValue={user?.email}
                                className="rounded-xl h-12 bg-muted/50"
                                placeholder="usuario@ejemplo.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">
                                Contraseña {isEditing && <span className="text-muted-foreground font-normal">(dejar vacío para no cambiar)</span>}
                            </label>
                            <Input
                                name="password"
                                type="password"
                                required={!isEditing}
                                className="rounded-xl h-12 bg-muted/50"
                                placeholder={isEditing ? "••••••••" : "Mínimo 8 caracteres"}
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">Rol</label>
                                <select
                                    name="roleId"
                                    required
                                    defaultValue={user?.role?.id || ""}
                                    className="w-full rounded-xl h-12 bg-muted/50 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="" disabled>Seleccionar rol</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">Sucursal</label>
                                <select
                                    name="branchId"
                                    defaultValue={user?.branch?.id || ""}
                                    className="w-full rounded-xl h-12 bg-muted/50 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Sin sucursal</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                                    {isEditing ? "Guardar Cambios" : "Crear Usuario"}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
