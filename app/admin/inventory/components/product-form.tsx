"use client";

import { useEffect, useState } from "react";
import { createProduct, updateProduct } from "@/app/actions/product";
import { getCategories } from "@/app/actions/category";
import { getProductFamilies } from "@/app/actions/product";
import { getRawMaterials } from "@/app/actions/lots";
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
import { PackagePlus, Save, Loader2, Star, Image as ImageIcon } from "lucide-react";
import { ProductColumn } from "./columns";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ProductFormProps {
    product?: ProductColumn;
    trigger?: React.ReactNode;
}

export function ProductForm({ product, trigger }: ProductFormProps) {
    const isEditing = !!product;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
    const [imageFailed, setImageFailed] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [categoryId, setCategoryId] = useState<string>(product?.categoryId ?? "none");
    const [families, setFamilies] = useState<{ id: string; name: string }[]>([]);
    const [familyName, setFamilyName] = useState<string>(product?.family?.name ?? "");
    const [isActive, setIsActive] = useState<boolean>(product?.isActive ?? true);
    const [trackingMode, setTrackingMode] = useState<string>(product?.trackingMode ?? "SIMPLE");
    const [rawMaterials, setRawMaterials] = useState<{ id: string; name: string }[]>([]);
    const [rawMaterialId, setRawMaterialId] = useState<string>(product?.rawMaterial?.id ?? "none");

    useEffect(() => {
        if (!open) return;
        getCategories().then((c) => setCategories(c.map(({ id, name }) => ({ id, name })))).catch(() => setCategories([]));
        getProductFamilies().then(setFamilies).catch(() => setFamilies([]));
        getRawMaterials().then((rows) => setRawMaterials(rows.map(({ id, name }) => ({ id, name })))).catch(() => setRawMaterials([]));
    }, [open]);

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
        try {
            const result = isEditing
                ? await updateProduct(product.id, formData)
                : await createProduct(formData);

            if (result.success) {
                toast.success(isEditing ? "Producto actualizado" : "Producto creado");
                setOpen(false);
            } else {
                toast.error(result.error || "Ocurrió un error inesperado.");
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error de comunicación con el servidor");
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

            <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[92vh] overflow-y-auto rounded-[2rem] p-5 sm:p-8 bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {isEditing ? "Editar Producto" : "Nuevo Producto"}
                    </DialogTitle>
                    <DialogDescription>
                        Completa la información del inventario. Los campos de impuestos son porcentajes (Ej: 19 para 19%).
                    </DialogDescription>
                </DialogHeader>

                <form action={handleAction} className="space-y-6 mt-4">
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                        {/* Category and status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="categoryId" className="text-sm font-semibold ml-1">Categoría</label>
                                <select
                                    id="categoryId"
                                    name="categoryId"
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full h-12 rounded-xl bg-muted/50 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="none">Sin categoría</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">Disponible en caja</label>
                                <div className="h-12 flex items-center gap-3 px-3 rounded-xl bg-muted/50 border border-border">
                                    <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                                    <label htmlFor="isActive" className="text-sm text-muted-foreground">{isActive ? "Se puede vender" : "Oculto en el POS"}</label>
                                    <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="familyName" className="text-sm font-semibold ml-1">
                                Familia <span className="font-normal text-muted-foreground">(opcional, para promociones)</span>
                            </label>
                            <Input
                                id="familyName"
                                name="familyName"
                                list="family-options"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                className="rounded-xl h-11 bg-muted/50"
                                placeholder="Ej: Buldak — agrupa sus sabores para las promos"
                            />
                            <datalist id="family-options">
                                {families.map((f) => <option key={f.id} value={f.name} />)}
                            </datalist>
                            <p className="text-xs text-muted-foreground ml-1">
                                Escribe un nombre nuevo o elige uno existente de la lista. Deja vacío si este producto no participa en ninguna promoción.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="trackingMode" className="text-sm font-semibold ml-1">Seguimiento de inventario</label>
                            <select
                                id="trackingMode"
                                name="trackingMode"
                                value={trackingMode}
                                onChange={(e) => setTrackingMode(e.target.value)}
                                className="w-full h-12 rounded-xl bg-muted/50 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="SIMPLE">Simple — solo cantidad en existencia</option>
                                <option value="LOT">Por lote — exige lote/vencimiento al recibir mercancía</option>
                                <option value="NONE">Sin inventario — no se cuenta (ej. café, helado soft)</option>
                            </select>
                            <p className="text-xs text-muted-foreground ml-1">
                                {trackingMode === "LOT"
                                    ? "La entrada de mercancía se hace desde \"Recibir lote\" en la tabla de inventario, no aquí."
                                    : trackingMode === "NONE"
                                        ? "Este producto se podrá vender siempre, sin descontar existencias."
                                        : "Como hoy: un número de existencias, sin lote."}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="rawMaterialId" className="text-sm font-semibold ml-1">
                                Insumo consumido <span className="font-normal text-muted-foreground">(opcional)</span>
                            </label>
                            <select
                                id="rawMaterialId"
                                name="rawMaterialId"
                                value={rawMaterialId}
                                onChange={(e) => setRawMaterialId(e.target.value)}
                                className="w-full h-12 rounded-xl bg-muted/50 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="none">Ninguno</option>
                                {rawMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <p className="text-xs text-muted-foreground ml-1">
                                Ej: “Café Americano” hecho con el insumo “Café en grano” — permite reportar qué se vendió mientras duró cada lote. Los insumos se crean en la pestaña “Insumos”.
                            </p>
                        </div>

                        {/* Image URL and Favorite */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1 flex items-center gap-1.5">
                                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                    URL de la Imagen
                                    <span className="text-xs font-normal text-muted-foreground">(Opcional)</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        name="imageUrl"
                                        value={imageUrl}
                                        onChange={(e) => { setImageUrl(e.target.value); setImageFailed(false); }}
                                        className="rounded-xl h-11 bg-muted/50"
                                        placeholder="https://ejemplo.com/imagen.jpg"
                                    />
                                    <div className="shrink-0 w-11 h-11 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden">
                                        {imageUrl && !imageFailed ? (
                                            // eslint-disable-next-line @next/next/no-img-element -- external product photo, unknown size
                                            <img
                                                src={imageUrl}
                                                alt="Vista previa"
                                                className="w-full h-full object-cover"
                                                onLoad={() => setImageFailed(false)}
                                                onError={() => setImageFailed(true)}
                                            />
                                        ) : (
                                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                                {imageUrl && imageFailed && (
                                    <p className="text-xs text-destructive ml-1">No se pudo cargar esta imagen. Revisa la URL o prueba con otra.</p>
                                )}
                            </div>
                            <div className="flex items-center gap-3 h-11 px-4 rounded-xl border bg-muted/30 w-fit">
                                <Switch
                                    id="isFavorite"
                                    name="isFavorite"
                                    value="true"
                                    defaultChecked={product?.isFavorite}
                                />
                                <label
                                    htmlFor="isFavorite"
                                    className="text-sm font-semibold cursor-pointer flex items-center gap-1.5"
                                >
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    Marcar como Favorito en POS
                                </label>
                            </div>
                        </div>

                        {/* Costing Engine */}
                        <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 space-y-4">
                            <h3 className="font-bold text-primary">Calculadora de Precios</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">Costo Base ($)</label>
                                    <Input
                                        name="cost"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={cost}
                                        onChange={(e) => setCost(Number(e.target.value))}
                                        className="rounded-xl h-11 bg-background border-primary/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">Margen (%)</label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={expectedMargin}
                                        onChange={(e) => setExpectedMargin(Number(e.target.value))}
                                        className="rounded-xl h-11 bg-background border-primary/20 text-primary font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">Precio Final ($)</label>
                                    <Input
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={price}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        className="rounded-xl h-11 bg-background border-primary/20 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
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
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1">Inventario</label>
                                <Input
                                    name="stock"
                                    type="number"
                                    step="0.01"
                                    required
                                    defaultValue={product?.stock ?? 0}
                                    className="rounded-xl h-11 bg-muted/50"
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold ml-1 mb-2">Impuestos</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">IVA (%)</label>
                                        <Input
                                            name="taxIva"
                                            type="number"
                                            step="0.01"
                                            defaultValue={product?.taxIva ?? 0}
                                            className="rounded-xl h-11 bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">ICA (%)</label>
                                        <Input
                                            name="taxIca"
                                            type="number"
                                            step="0.01"
                                            defaultValue={product?.taxIca ?? 0}
                                            className="rounded-xl h-11 bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">ImpoConsumo (%)</label>
                                        <Input
                                            name="taxImpoConsumo"
                                            type="number"
                                            step="0.01"
                                            defaultValue={product?.taxImpoConsumo ?? 0}
                                            className="rounded-xl h-11 bg-muted/50"
                                        />
                                    </div>
                                </div>
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
