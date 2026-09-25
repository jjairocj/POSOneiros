"use client";

import { useEffect, useState } from "react";
import { createProduct, updateProduct } from "@/app/actions/product";
import { getCategories } from "@/app/actions/category";
import { getProductFamilies } from "@/app/actions/product";
import { getRawMaterials } from "@/app/actions/lots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    PackagePlus, Save, Loader2, Star, Image as ImageIcon, Upload, Search,
    Info, DollarSign, Boxes, SlidersHorizontal, Calculator, Percent,
} from "lucide-react";
import { uploadProductImageAction } from "@/app/actions/upload";
import { ProductColumn } from "./columns";
import { StockMovementModal } from "./StockMovementModal";
import { Combobox } from "./Combobox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Hint, HintDialogDescription } from "@/app/components/TutorialMode";

interface ProductFormProps {
    product?: ProductColumn;
    trigger?: React.ReactNode;
}

const TABS = [
    { value: "basico", label: "Básico", icon: Info },
    { value: "precio", label: "Precio", icon: DollarSign },
    { value: "inventario", label: "Inventario", icon: Boxes },
    { value: "imagen", label: "Imagen", icon: ImageIcon },
] as const;

export function ProductForm({ product, trigger }: ProductFormProps) {
    const isEditing = !!product;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<string>("basico");
    const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
    const [imageFailed, setImageFailed] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    // Mirrors the (uncontrolled) name input, only to build the Google Images search link.
    const [nameValue, setNameValue] = useState(product?.name || "");
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [categoryId, setCategoryId] = useState<string>(product?.categoryId ?? "none");
    const [families, setFamilies] = useState<{ id: string; name: string }[]>([]);
    const [familyName, setFamilyName] = useState<string>(product?.family?.name ?? "");
    const [isActive, setIsActive] = useState<boolean>(product?.isActive ?? true);
    const [trackingMode, setTrackingMode] = useState<string>(product?.trackingMode ?? "SIMPLE");
    const [rawMaterials, setRawMaterials] = useState<{ id: string; name: string }[]>([]);
    const [rawMaterialId, setRawMaterialId] = useState<string>(product?.rawMaterial?.id ?? "none");
    const [adjustOpen, setAdjustOpen] = useState(false);
    // Local mirror of stock so "Ajustar inventario" (which registers a real
    // StockMovement and updates the DB on its own) can reflect the new number
    // here without needing to close/reopen this dialog.
    const [currentStock, setCurrentStock] = useState<number>(product?.stock ?? 0);

    useEffect(() => {
        if (!open) return;
        setTab("basico");
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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting the same file
        if (!file) return;
        setUploading(true);
        setUploadError("");
        try {
            const fd = new FormData();
            fd.set("file", file);
            const res = await uploadProductImageAction(fd);
            if (!res.ok) { setUploadError(res.error); return; }
            setImageUrl(res.data.url);
            setImageFailed(false);
        } catch {
            setUploadError("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setUploading(false);
        }
    };

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

            <DialogContent className="max-w-[95vw] sm:max-w-[680px] max-h-[92vh] overflow-y-auto rounded-[2rem] p-5 sm:p-8 bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {isEditing ? "Editar Producto" : "Nuevo Producto"}
                    </DialogTitle>
                    <HintDialogDescription>
                        {isEditing ? `Editando "${product.name}".` : "Completa lo básico para crear el producto — lo demás tiene valores por defecto razonables."}
                    </HintDialogDescription>
                </DialogHeader>

                <form action={handleAction} className="mt-4">
                    <Tabs value={tab} onValueChange={setTab}>
                        <TabsList className="flex gap-1 bg-muted/40 backdrop-blur-sm p-1.5 rounded-2xl w-full h-auto border border-border/50">
                            {TABS.map(({ value, label, icon: Icon }) => (
                                <TabsTrigger
                                    key={value}
                                    value={value}
                                    title={label}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold text-muted-foreground transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:text-foreground"
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="hidden sm:inline">{label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* forceMount + hidden (not conditional rendering): every field across every
                            tab must stay mounted so a single native form submit collects all of them,
                            regardless of which tab is showing when the user hits "Guardar". */}

                        {/* ── Básico ──────────────────────────────────────────────────────── */}
                        <TabsContent value="basico" forceMount hidden={tab !== "basico"} className="space-y-5 mt-6 outline-none">
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
                                        onChange={(e) => setNameValue(e.target.value)}
                                        className="rounded-xl h-12 bg-muted/50"
                                        placeholder="Ej: Chocoramo"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="categoryId" className="text-sm font-semibold ml-1">Categoría</label>
                                    <Combobox
                                        id="categoryId"
                                        name="categoryId"
                                        value={categoryId}
                                        onChange={setCategoryId}
                                        emptyOption={{ value: "none", label: "Sin categoría" }}
                                        options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                        placeholder="Buscar categoría..."
                                    />
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
                        </TabsContent>

                        {/* ── Precio ──────────────────────────────────────────────────────── */}
                        <TabsContent value="precio" forceMount hidden={tab !== "precio"} className="space-y-6 mt-6 outline-none">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 ml-1">
                                    <Calculator className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-semibold">Calculadora de precio</p>
                                </div>
                                <div className="bg-muted/30 border border-border rounded-2xl p-4 sm:p-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">Costo base</label>
                                            <MoneyInput
                                                name="cost"
                                                value={cost}
                                                onChange={setCost}
                                                className="rounded-xl h-11 bg-background"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">Margen deseado</label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={expectedMargin}
                                                    onChange={(e) => setExpectedMargin(Number(e.target.value))}
                                                    className="rounded-xl h-11 bg-background pr-8"
                                                />
                                                <Percent className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wide">Precio final</label>
                                            <MoneyInput
                                                name="price"
                                                value={price}
                                                onChange={setPrice}
                                                className="rounded-xl h-11 bg-background font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        <div className="bg-background p-3 rounded-xl border border-border flex justify-between items-center">
                                            <span className="text-muted-foreground">Precio sugerido</span>
                                            <span className="font-mono font-bold text-lg">${suggestedPrice.toFixed(0)}</span>
                                        </div>
                                        <div className={`p-3 rounded-xl border flex justify-between items-center ${realMarginPercent >= expectedMargin ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'}`}>
                                            <span className="font-semibold">Margen real</span>
                                            <div className="text-right">
                                                <div className="font-bold text-lg">{realMarginPercent.toFixed(1)}%</div>
                                                <div className="text-xs opacity-80">+${realMarginValue.toFixed(0)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-semibold ml-1">Impuestos <span className="font-normal text-muted-foreground">(opcional)</span></p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        </TabsContent>

                        {/* ── Inventario ──────────────────────────────────────────────────── */}
                        <TabsContent value="inventario" forceMount hidden={tab !== "inventario"} className="space-y-5 mt-6 outline-none">
                            <div className="space-y-1.5">
                                <label htmlFor="trackingMode" className="text-sm font-semibold ml-1">Seguimiento de inventario</label>
                                <Combobox
                                    id="trackingMode"
                                    name="trackingMode"
                                    value={trackingMode}
                                    onChange={setTrackingMode}
                                    placeholder="Buscar modo..."
                                    options={[
                                        { value: "SIMPLE", label: "Simple — solo cantidad en existencia" },
                                        { value: "LOT", label: "Por lote — exige lote/vencimiento al recibir mercancía" },
                                        { value: "NONE", label: "Sin inventario — no se cuenta (ej. café, helado soft)" },
                                    ]}
                                />
                                <Hint className="text-xs text-muted-foreground ml-1">
                                    {trackingMode === "LOT"
                                        ? "La entrada de mercancía se hace desde \"Recibir lote\" en la tabla de inventario, no aquí."
                                        : trackingMode === "NONE"
                                            ? "Este producto se podrá vender siempre, sin descontar existencias."
                                            : "Como hoy: un número de existencias, sin lote."}
                                </Hint>
                            </div>

                            {/* Create: a starting count is reasonable to type in directly. Edit: the
                                only path to change stock is "Ajustar inventario" (StockMovementModal),
                                which records a real StockMovement — editing this number in place used
                                to silently change stock with zero audit trail. */}
                            {isEditing ? (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold ml-1">Inventario actual</label>
                                    <div className="flex items-center gap-3 h-12 px-4 rounded-xl bg-muted/50 border border-border">
                                        <span className="font-bold text-lg flex-1">{currentStock}</span>
                                        <Button type="button" size="sm" variant="outline" className="rounded-lg h-8 gap-1.5" onClick={() => setAdjustOpen(true)}>
                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                            Ajustar inventario
                                        </Button>
                                    </div>
                                    <Hint className="text-xs text-muted-foreground ml-1">
                                        El stock ya no se edita aquí directamente — cada cambio queda registrado en el Kardex (Entrada / Merma / Ajuste).
                                    </Hint>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold ml-1">Stock inicial</label>
                                    <Input
                                        name="stock"
                                        type="number"
                                        step="0.01"
                                        required
                                        defaultValue={0}
                                        className="rounded-xl h-11 bg-muted/50"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="rawMaterialId" className="text-sm font-semibold ml-1">
                                    Insumo consumido <span className="font-normal text-muted-foreground">(opcional)</span>
                                </label>
                                <Combobox
                                    id="rawMaterialId"
                                    name="rawMaterialId"
                                    value={rawMaterialId}
                                    onChange={setRawMaterialId}
                                    emptyOption={{ value: "none", label: "Ninguno" }}
                                    options={rawMaterials.map((m) => ({ value: m.id, label: m.name }))}
                                    placeholder="Buscar insumo..."
                                />
                                <Hint className="text-xs text-muted-foreground ml-1">
                                    Ej: “Café Americano” hecho con el insumo “Café en grano” — permite reportar qué se vendió mientras duró cada lote. Los insumos se crean en la pestaña “Insumos”.
                                </Hint>
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
                                <Hint className="text-xs text-muted-foreground ml-1">
                                    Escribe un nombre nuevo o elige uno existente de la lista. Deja vacío si este producto no participa en ninguna promoción.
                                </Hint>
                            </div>
                        </TabsContent>

                        {/* ── Imagen ──────────────────────────────────────────────────────── */}
                        <TabsContent value="imagen" forceMount hidden={tab !== "imagen"} className="space-y-4 mt-6 outline-none">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold ml-1 flex items-center gap-1.5">
                                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                    Imagen del producto
                                    <span className="text-xs font-normal text-muted-foreground">(Opcional)</span>
                                </label>

                                {/* Big preview — the tiny 44px swatch this used to be made it
                                    impossible to tell if an image actually looked right. */}
                                <div className="w-full h-44 rounded-2xl border border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                                    {imageUrl && !imageFailed ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- external product photo, unknown size
                                        <img
                                            src={imageUrl}
                                            alt="Vista previa"
                                            className="w-full h-full object-contain p-2"
                                            onLoad={() => setImageFailed(false)}
                                            onError={() => setImageFailed(true)}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                                            <ImageIcon className="w-7 h-7" />
                                            <span className="text-xs">Sin imagen todavía</span>
                                        </div>
                                    )}
                                </div>

                                <Input
                                    name="imageUrl"
                                    value={imageUrl}
                                    onChange={(e) => { setImageUrl(e.target.value); setImageFailed(false); }}
                                    className="rounded-xl h-11 bg-muted/50"
                                    placeholder="https://ejemplo.com/imagen.jpg"
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`h-11 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${uploading ? "opacity-60 pointer-events-none" : "hover:border-primary hover:text-primary hover:bg-primary/5"}`}>
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        Subir imagen
                                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                                    </label>
                                    <button
                                        type="button"
                                        disabled={!nameValue.trim()}
                                        onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(nameValue.trim())}`, "_blank", "noopener,noreferrer")}
                                        title={nameValue.trim() ? undefined : "Escribe primero el nombre del producto"}
                                        className="h-11 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary hover:bg-primary/5 disabled:opacity-40 disabled:pointer-events-none"
                                    >
                                        <Search className="w-4 h-4" />
                                        Buscar en Google
                                    </button>
                                </div>

                                {uploadError && <p className="text-xs text-destructive ml-1">{uploadError}</p>}
                                {imageUrl && imageFailed && (
                                    <p className="text-xs text-destructive ml-1">No se pudo cargar esta imagen. Revisa la URL o prueba con otra.</p>
                                )}
                                <Hint className="text-xs text-muted-foreground ml-1">
                                    "Buscar en Google" abre una pestaña con imágenes de "{nameValue.trim() || "el nombre del producto"}" — clic derecho → copiar dirección de la imagen, pégala arriba. "Subir" guarda la imagen en tu almacenamiento propio (MinIO).
                                </Hint>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="pt-6 flex gap-3">
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

                {adjustOpen && product && (
                    <StockMovementModal
                        product={{ id: product.id, name: product.name, stock: currentStock, cost: product.cost }}
                        onClose={(newStock) => {
                            setAdjustOpen(false);
                            if (typeof newStock === "number") setCurrentStock(newStock);
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
