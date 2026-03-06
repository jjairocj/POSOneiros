"use client";

import { useState } from "react";
import { createProduct, updateProduct } from "@/app/actions/product";
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
import { PackagePlus, Save, Loader2 } from "lucide-react";
import { ProductColumn } from "./columns";

interface ProductFormProps {
    product?: ProductColumn;
    trigger?: React.ReactNode;
}

export function ProductForm({ product, trigger }: ProductFormProps) {
    const isEditing = !!product;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Costing Calculator State
    const [cost, setCost] = useState<number>(product?.cost || 0);
    const [expectedMargin, setExpectedMargin] = useState<number>(30); // 30% default target margin
    const [price, setPrice] = useState<number>(product?.price || 0);

    // Derived State Computations
    const suggestedPrice = cost + (cost * (expectedMargin / 100));
    const realMarginValue = price - cost;
    const realMarginPercent = cost > 0 ? (realMarginValue / cost) * 100 : 0;

    const handleAction = async (formData: FormData) => {
        setLoading(true);
        setError("");
        
        try {
            const result = isEditing 
                ? await updateProduct(product.id, formData)
                : await createProduct(formData);

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
                    <Button className="bg-primary text-primary-foreground font-bold px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm">
                        <PackagePlus className="w-5 h-5 mr-2" />
                        Nuevo Producto
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-6 bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {isEditing ? "Editar Producto" : "Nuevo Producto"}
                    </DialogTitle>
                    <DialogDescription>
                        Completa la información del inventario. Los campos de impuestos son porcentajes (Ej: 19 para 19%).
                    </DialogDescription>
                </DialogHeader>

                <form action={handleAction} className="space-y-4 mt-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm font-semibold p-3 rounded-xl border border-destructive/20">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">Código / SKU</label>
                                <Input 
                                    name="code" 
                                    required 
                                    defaultValue={product?.code} 
                                    className="rounded-xl h-12 bg-muted/50" 
                                    placeholder="Ej: CHC-001"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">Nombre</label>
                                <Input 
                                    name="name" 
                                    required 
                                    defaultValue={product?.name} 
                                    className="rounded-xl h-12 bg-muted/50" 
                                    placeholder="Ej: Chocoramo"
                                />
                            </div>
                        </div>

                        {/* Costing Engine */}
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-primary">Calculadora de Precios</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold ml-1">Costo Base ($)</label>
                                    <Input 
                                        name="cost" 
                                        type="number" 
                                        step="0.01"
                                        required 
                                        value={cost}
                                        onChange={(e) => setCost(Number(e.target.value))}
                                        className="rounded-xl h-12 bg-background border-primary/20" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold ml-1">Ganancia Esperada (%)</label>
                                    <Input 
                                        type="number" 
                                        step="0.1"
                                        value={expectedMargin}
                                        onChange={(e) => setExpectedMargin(Number(e.target.value))}
                                        className="rounded-xl h-12 bg-background border-primary/20 text-primary font-bold" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold ml-1">Precio Final ($)</label>
                                    <Input 
                                        name="price" 
                                        type="number" 
                                        step="0.01"
                                        required 
                                        value={price}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        className="rounded-xl h-12 bg-background border-primary/20 font-bold" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                                <div className="bg-background p-3 rounded-xl border border-border flex justify-between items-center">
                                    <span className="text-muted-foreground">Precio Sugerido:</span>
                                    <span className="font-mono font-bold text-lg">${suggestedPrice.toFixed(0)}</span>
                                </div>
                                <div className={`p-3 rounded-xl border flex justify-between items-center ${realMarginPercent >= expectedMargin ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'}`}>
                                    <span className="font-semibold">Margen Real:</span>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">{realMarginPercent.toFixed(1)}%</div>
                                        <div className="text-xs opacity-80">+${realMarginValue.toFixed(0)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stock and Taxes */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">Inventario Inicial</label>
                                <Input 
                                    name="stock" 
                                    type="number" 
                                    step="0.01"
                                    required 
                                    defaultValue={product?.stock ?? 0} 
                                    className="rounded-xl h-12 bg-muted/50" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">IVA (%)</label>
                                <Input 
                                    name="taxIva" 
                                    type="number" 
                                    step="0.01"
                                    defaultValue={product?.taxIva ?? 0} 
                                    className="rounded-xl h-12 bg-muted/50" 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">ICA (%)</label>
                                <Input 
                                    name="taxIca" 
                                    type="number" 
                                    step="0.01"
                                    defaultValue={product?.taxIca ?? 0} 
                                    className="rounded-xl h-12 bg-muted/50" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">ImpoConsumo (%)</label>
                                <Input 
                                    name="taxImpoConsumo" 
                                    type="number" 
                                    step="0.01"
                                    defaultValue={product?.taxImpoConsumo ?? 0} 
                                    className="rounded-xl h-12 bg-muted/50" 
                                />
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
                                    {isEditing ? "Guardar Cambios" : "Crear Producto"}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
