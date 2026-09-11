"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getProducts } from "@/app/actions/product";
import { getProductFamilies } from "@/app/actions/product";
import { createPromotion, updatePromotion, type PromotionInput, type PromotionRow } from "@/app/actions/promotions";

type Pick = { kind: "product" | "family"; id: string };

interface ConditionRow {
    pick: Pick | null;
    minQuantity: string;
}

const EFFECT_LABEL: Record<string, string> = {
    FREE_ITEM: "Regalar (queda en $0)",
    FIXED_PRICE: "Dejar en un precio fijo",
    PERCENT_OFF: "Descuento por porcentaje",
    AMOUNT_OFF: "Descuento por monto fijo",
};

export function PromotionForm({ promotion, trigger }: { promotion?: PromotionRow; trigger?: React.ReactNode }) {
    const isEditing = !!promotion;
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
    const [families, setFamilies] = useState<{ id: string; name: string }[]>([]);

    const [name, setName] = useState(promotion?.name ?? "");
    const [isActive, setIsActive] = useState(promotion?.isActive ?? true);
    const [priority, setPriority] = useState(String(promotion?.priority ?? 0));
    const [startDate, setStartDate] = useState(promotion?.startDate?.slice(0, 10) ?? "");
    const [endDate, setEndDate] = useState(promotion?.endDate?.slice(0, 10) ?? "");
    const [conditions, setConditions] = useState<ConditionRow[]>(
        promotion?.conditions.length
            ? promotion.conditions.map((c) => ({ pick: c.productId ? { kind: "product", id: c.productId } : c.familyId ? { kind: "family", id: c.familyId } : null, minQuantity: String(c.minQuantity) }))
            : [{ pick: null, minQuantity: "1" }]
    );
    const [effectType, setEffectType] = useState(promotion?.effect?.type ?? "FREE_ITEM");
    const [targetType, setTargetType] = useState(promotion?.effect?.targetType ?? "PRODUCT");
    const [targetPick, setTargetPick] = useState<Pick | null>(
        promotion?.effect?.targetProductId ? { kind: "product", id: promotion.effect.targetProductId }
            : promotion?.effect?.targetFamilyId ? { kind: "family", id: promotion.effect.targetFamilyId } : null
    );
    const [value, setValue] = useState(promotion?.effect?.value != null ? String(promotion.effect.value) : "");
    const [targetQuantity, setTargetQuantity] = useState(String(promotion?.effect?.targetQuantity ?? 1));

    useEffect(() => {
        if (!open) return;
        getProducts(undefined, undefined, { includeInactive: true }).then((p) => setProducts(p.map((x) => ({ id: x.id, name: x.name })))).catch(() => setProducts([]));
        getProductFamilies().then(setFamilies).catch(() => setFamilies([]));
    }, [open]);

    const updateCondition = (idx: number, patch: Partial<ConditionRow>) => {
        setConditions((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };
    const addCondition = () => setConditions((rows) => [...rows, { pick: null, minQuantity: "1" }]);
    const removeCondition = (idx: number) => setConditions((rows) => rows.filter((_, i) => i !== idx));

    const parsePick = (raw: string): Pick | null => {
        if (!raw) return null;
        const [kind, id] = raw.split(":");
        return kind === "product" || kind === "family" ? { kind, id } : null;
    };
    const pickValue = (p: Pick | null) => (p ? `${p.kind}:${p.id}` : "");

    const submit = async () => {
        setError("");
        if (!name.trim()) { setError("El nombre es obligatorio."); return; }
        if (conditions.some((c) => !c.pick)) { setError("Cada condición necesita un producto o familia."); return; }
        if (targetType !== "CONDITION_ITEMS" && !targetPick) { setError("Selecciona a qué producto o familia aplica el efecto."); return; }

        const input: PromotionInput = {
            name: name.trim(),
            isActive,
            priority: Number(priority) || 0,
            startDate: startDate || null,
            endDate: endDate || null,
            conditions: conditions.map((c) => ({
                productId: c.pick?.kind === "product" ? c.pick.id : null,
                familyId: c.pick?.kind === "family" ? c.pick.id : null,
                minQuantity: Number(c.minQuantity) || 1,
            })),
            effect: {
                type: effectType as PromotionInput["effect"]["type"],
                targetType: targetType as PromotionInput["effect"]["targetType"],
                targetProductId: targetType === "PRODUCT" ? targetPick?.id ?? null : null,
                targetFamilyId: targetType === "FAMILY" ? targetPick?.id ?? null : null,
                value: effectType === "FREE_ITEM" ? null : Number(value) || 0,
                targetQuantity: Number(targetQuantity) || 1,
            },
        };

        setLoading(true);
        try {
            const result = isEditing ? await updatePromotion(promotion.id, input) : await createPromotion(input);
            if (result.ok) {
                toast.success(isEditing ? "Promoción actualizada." : "Promoción creada.");
                setOpen(false);
                router.refresh();
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error de comunicación con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    const pickerOptions = (
        <>
            <optgroup label="Productos">
                {products.map((p) => <option key={`product:${p.id}`} value={`product:${p.id}`}>{p.name}</option>)}
            </optgroup>
            <optgroup label="Familias">
                {families.map((f) => <option key={`family:${f.id}`} value={`family:${f.id}`}>{f.name} (cualquier variante)</option>)}
            </optgroup>
        </>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-primary text-primary-foreground font-bold px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm">
                        <Sparkles className="w-5 h-5 mr-2" /> Nueva Promoción
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[640px] max-h-[92vh] overflow-y-auto rounded-[2rem] p-5 sm:p-8 bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">{isEditing ? "Editar Promoción" : "Nueva Promoción"}</DialogTitle>
                    <DialogDescription>
                        Se aplica sola cuando el carrito cumple las condiciones — el cajero no la activa. Las promociones no se acumulan: si varias aplican a la vez, gana la de menor número de prioridad.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {error && <div className="bg-destructive/10 text-destructive text-sm font-semibold p-3 rounded-xl border border-destructive/20">{error}</div>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Nombre</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl h-11 bg-muted/50" placeholder="Ej: Combo Buldak + Shin" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Prioridad <span className="font-normal text-muted-foreground">(menor = gana)</span></label>
                            <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl h-11 bg-muted/50" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Desde <span className="font-normal text-muted-foreground">(opcional)</span></label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-11 bg-muted/50" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold ml-1">Hasta <span className="font-normal text-muted-foreground">(opcional)</span></label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl h-11 bg-muted/50" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 h-11 px-4 rounded-xl border bg-muted/30 w-fit">
                        <Switch id="promo-active" checked={isActive} onCheckedChange={setIsActive} />
                        <label htmlFor="promo-active" className="text-sm font-semibold cursor-pointer">{isActive ? "Activa" : "Desactivada"}</label>
                    </div>

                    <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 space-y-3">
                        <h3 className="font-bold text-primary">Condiciones (todas deben cumplirse)</h3>
                        {conditions.map((c, idx) => (
                            <div key={idx} className="flex flex-wrap items-end gap-2">
                                <div className="space-y-1 flex-1 min-w-[180px]">
                                    <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase">Producto o familia</label>
                                    <select value={pickValue(c.pick)} onChange={(e) => updateCondition(idx, { pick: parsePick(e.target.value) })} className="w-full h-10 rounded-lg bg-background border border-input px-2 text-sm">
                                        <option value="">Selecciona…</option>
                                        {pickerOptions}
                                    </select>
                                </div>
                                <div className="space-y-1 w-24">
                                    <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase">Cant. mín.</label>
                                    <Input type="number" min="1" step="1" value={c.minQuantity} onChange={(e) => updateCondition(idx, { minQuantity: e.target.value })} className="h-10 rounded-lg bg-background" />
                                </div>
                                <Button type="button" size="sm" variant="ghost" onClick={() => removeCondition(idx)} disabled={conditions.length === 1} className="h-10">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" size="sm" variant="outline" onClick={addCondition} className="rounded-lg">
                            <Plus className="w-4 h-4 mr-1" /> Agregar condición
                        </Button>
                    </div>

                    <div className="bg-secondary/10 p-5 rounded-2xl border border-secondary/20 space-y-3">
                        <h3 className="font-bold">Efecto</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase">Qué hace</label>
                                <select value={effectType} onChange={(e) => setEffectType(e.target.value as typeof effectType)} className="w-full h-10 rounded-lg bg-background border border-input px-2 text-sm">
                                    {Object.entries(EFFECT_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase">A qué aplica</label>
                                <select value={targetType} onChange={(e) => setTargetType(e.target.value as typeof targetType)} className="w-full h-10 rounded-lg bg-background border border-input px-2 text-sm">
                                    <option value="CONDITION_ITEMS">Al combo de las condiciones</option>
                                    <option value="PRODUCT">A un producto específico</option>
                                    <option value="FAMILY">A cualquiera de una familia</option>
                                </select>
                            </div>
                        </div>

                        {targetType !== "CONDITION_ITEMS" && (
                            <div className="space-y-1">
                                <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase">{targetType === "PRODUCT" ? "Producto" : "Familia"}</label>
                                <select
                                    value={pickValue(targetPick)}
                                    onChange={(e) => setTargetPick(parsePick(e.target.value))}
                                    className="w-full h-10 rounded-lg bg-background border border-input px-2 text-sm"
                                >
                                    <option value="">Selecciona…</option>
                                    {targetType === "PRODUCT"
                                        ? products.map((p) => <option key={p.id} value={`product:${p.id}`}>{p.name}</option>)
                                        : families.map((f) => <option key={f.id} value={`family:${f.id}`}>{f.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            {effectType !== "FREE_ITEM" && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase">
                                        {effectType === "PERCENT_OFF" ? "Porcentaje (%)" : "Valor ($)"}
                                    </label>
                                    <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="h-10 rounded-lg bg-background" />
                                </div>
                            )}
                            {targetType !== "CONDITION_ITEMS" && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold ml-1 text-muted-foreground uppercase">Cantidad</label>
                                    <Input type="number" min="1" step="1" value={targetQuantity} onChange={(e) => setTargetQuantity(e.target.value)} className="h-10 rounded-lg bg-background" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {targetType === "CONDITION_ITEMS"
                                ? "El efecto se calcula sobre las cantidades exactas de las condiciones (el combo), no sobre unidades extra del mismo producto en el carrito."
                                : "El producto/familia del efecto debe estar también en el carrito — si no está, la promoción simplemente no aplica."}
                        </p>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl h-12 font-bold" disabled={loading}>Cancelar</Button>
                    <Button type="button" onClick={submit} className="flex-1 rounded-xl h-12 font-bold shadow-lg" disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Save className="w-5 h-5 mr-2" />{isEditing ? "Guardar" : "Crear"}</>)}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
