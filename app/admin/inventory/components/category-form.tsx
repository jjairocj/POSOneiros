"use client";

import { useState } from "react";
import { createCategory, updateCategory } from "@/app/actions/category";
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
import { FolderPlus, Save, Loader2 } from "lucide-react";
import { CategoryColumn } from "./category-columns";

interface CategoryFormProps {
    category?: CategoryColumn;
    trigger?: React.ReactNode;
}

export function CategoryForm({ category, trigger }: CategoryFormProps) {
    const isEditing = !!category;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAction = async (formData: FormData) => {
        setLoading(true);
        setError("");
        
        try {
            const result = isEditing 
                ? await updateCategory(category.id, formData)
                : await createCategory(formData);

            if (result.success) {
                setOpen(false);
            } else {
                setError(result.error || "Ocurrió un error inesperado.");
            }
        } catch (err: any) {
            setError(err.message || "Error de comunicación con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-secondary text-secondary-foreground font-bold px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 transition-all text-sm">
                        <FolderPlus className="w-5 h-5 mr-2" />
                        Nueva Categoría
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-6 bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {isEditing ? "Editar Categoría" : "Nueva Categoría"}
                    </DialogTitle>
                    <DialogDescription>
                        Define el nombre y el orden en el que aparecerá en el punto de venta (de izquierda a derecha).
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
                            <label className="text-sm font-semibold ml-1">Nombre de Categoría</label>
                            <Input 
                                name="name" 
                                required 
                                defaultValue={category?.name} 
                                className="rounded-xl h-12 bg-muted/50 font-bold text-lg" 
                                placeholder="Ej: Bebidas"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Orden de visualización (POS)</label>
                            <Input 
                                name="sortOrder" 
                                type="number" 
                                required 
                                defaultValue={category?.sortOrder ?? 0} 
                                className="rounded-xl h-12 bg-muted/50" 
                                placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground ml-1">
                                Menor número = Aparece más a la izquierda.
                            </p>
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
                                    {isEditing ? "Guardar" : "Crear"}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
