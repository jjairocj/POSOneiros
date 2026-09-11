"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePromotion, togglePromotionActive, type PromotionRow } from "@/app/actions/promotions";
import { PromotionForm } from "./PromotionForm";

const EFFECT_SUMMARY: Record<string, string> = {
    FREE_ITEM: "Regala",
    FIXED_PRICE: "Deja en precio fijo",
    PERCENT_OFF: "% de descuento",
    AMOUNT_OFF: "Descuento fijo",
};

function conditionLabel(c: PromotionRow["conditions"][number]) {
    const what = c.productName ?? (c.familyName ? `cualquier ${c.familyName}` : "?");
    return `${c.minQuantity}x ${what}`;
}

function effectLabel(e: NonNullable<PromotionRow["effect"]>) {
    const target = e.targetType === "CONDITION_ITEMS" ? "el combo" : e.targetType === "PRODUCT" ? e.targetProductName ?? "?" : `cualquier ${e.targetFamilyName ?? "?"}`;
    const valueStr = e.type === "FREE_ITEM" ? "" : e.type === "PERCENT_OFF" ? ` ${e.value}%` : ` $${(e.value ?? 0).toLocaleString("es-CO")}`;
    return `${EFFECT_SUMMARY[e.type]}${valueStr} → ${target}`;
}

export function PromotionsTab({ promotions }: { promotions: PromotionRow[] }) {
    const router = useRouter();

    const toggle = async (p: PromotionRow) => {
        const res = await togglePromotionActive(p.id, !p.isActive);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(p.isActive ? `"${p.name}" desactivada.` : `"${p.name}" activada.`);
        router.refresh();
    };

    const remove = async (p: PromotionRow) => {
        if (!confirm(`¿Eliminar la promoción "${p.name}"? Esto no afecta ventas ya registradas.`)) return;
        const res = await deletePromotion(p.id);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success("Promoción eliminada.");
        router.refresh();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground max-w-lg">
                    Se aplican solas cuando el carrito las cumple — el cajero no las activa. No se acumulan: si varias
                    aplican a la vez, gana la de menor número de prioridad.
                </p>
                <PromotionForm />
            </div>

            {promotions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sin promociones registradas todavía.</p>
            ) : (
                <ul className="space-y-3">
                    {promotions.map((p) => (
                        <li key={p.id} className={`bg-card border border-border rounded-2xl p-4 ${!p.isActive ? "opacity-60" : ""}`}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold truncate">{p.name}</span>
                                            <span className="text-xs bg-muted text-muted-foreground font-mono px-1.5 py-0.5 rounded">prio {p.priority}</span>
                                            {!p.isActive && <span className="text-xs bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-full">Inactiva</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {p.conditions.map(conditionLabel).join(" + ")} {p.effect && `→ ${effectLabel(p.effect)}`}
                                        </p>
                                        {(p.startDate || p.endDate) && (
                                            <p className="text-xs text-muted-foreground">
                                                Vigencia: {p.startDate ? new Date(p.startDate).toLocaleDateString("es-CO") : "sin inicio"} — {p.endDate ? new Date(p.endDate).toLocaleDateString("es-CO") : "sin fin"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <PromotionForm promotion={p} trigger={
                                        <Button size="sm" variant="outline" className="h-8 text-xs"><Pencil className="w-3.5 h-3.5 mr-1" /> Editar</Button>
                                    } />
                                    <Button size="sm" variant="ghost" onClick={() => toggle(p)} className="h-8 text-xs">
                                        <Power className="w-3.5 h-3.5 mr-1" /> {p.isActive ? "Desactivar" : "Activar"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => remove(p)} className="h-8 text-xs text-destructive hover:text-destructive">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
