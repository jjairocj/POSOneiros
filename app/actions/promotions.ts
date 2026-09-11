"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import type { PromotionRule, PromotionEffectType, PromotionTargetType } from "@/app/lib/promotions";

const EFFECT_TYPES: PromotionEffectType[] = ["FREE_ITEM", "FIXED_PRICE", "PERCENT_OFF", "AMOUNT_OFF"];
const TARGET_TYPES: PromotionTargetType[] = ["CONDITION_ITEMS", "PRODUCT", "FAMILY"];

export interface PromotionConditionInput {
    productId?: string | null;
    familyId?: string | null;
    minQuantity: number;
}

export interface PromotionEffectInput {
    type: PromotionEffectType;
    targetType: PromotionTargetType;
    targetProductId?: string | null;
    targetFamilyId?: string | null;
    value?: number | null;
    targetQuantity: number;
}

export interface PromotionInput {
    name: string;
    isActive: boolean;
    startDate?: string | null;
    endDate?: string | null;
    priority: number;
    conditions: PromotionConditionInput[];
    effect: PromotionEffectInput;
}

function validate(input: PromotionInput): string | null {
    if (!input.name?.trim()) return "El nombre es obligatorio.";
    if (!Number.isInteger(input.priority)) return "La prioridad debe ser un número entero.";
    if (!Array.isArray(input.conditions) || input.conditions.length === 0) return "Agrega al menos una condición.";
    for (const c of input.conditions) {
        if (!c.productId && !c.familyId) return "Cada condición necesita un producto o una familia.";
        if (c.productId && c.familyId) return "Cada condición debe ser un producto O una familia, no ambos.";
        if (!(c.minQuantity > 0)) return "La cantidad mínima de cada condición debe ser mayor a cero.";
    }
    const e = input.effect;
    if (!e || !EFFECT_TYPES.includes(e.type)) return "Selecciona qué hace la promoción.";
    if (!TARGET_TYPES.includes(e.targetType)) return "Selecciona a qué aplica el efecto.";
    if (e.targetType === "PRODUCT" && !e.targetProductId) return "Selecciona el producto que recibe el efecto.";
    if (e.targetType === "FAMILY" && !e.targetFamilyId) return "Selecciona la familia que recibe el efecto.";
    if (e.targetType !== "CONDITION_ITEMS" && !(e.targetQuantity > 0)) return "La cantidad del efecto debe ser mayor a cero.";
    if (e.type !== "FREE_ITEM") {
        if (e.value == null || !(e.value > 0)) return "Ingresa un valor mayor a cero para el efecto.";
        if (e.type === "PERCENT_OFF" && e.value > 100) return "El porcentaje no puede superar 100.";
    }
    if (input.startDate && input.endDate && new Date(input.startDate) > new Date(input.endDate)) {
        return "La fecha de inicio no puede ser posterior a la fecha de fin.";
    }
    return null;
}

export async function createPromotion(input: PromotionInput): Promise<ActionResult> {
    try {
        await requirePermission("MANAGE_CATALOG");
        const error = validate(input);
        if (error) return fail(error);
        await prisma.promotion.create({
            data: {
                name: input.name.trim(),
                isActive: input.isActive,
                startDate: input.startDate ? new Date(input.startDate) : null,
                endDate: input.endDate ? new Date(input.endDate) : null,
                priority: input.priority,
                conditions: { create: input.conditions.map((c) => ({ productId: c.productId || null, familyId: c.familyId || null, minQuantity: c.minQuantity })) },
                effect: {
                    create: {
                        type: input.effect.type, targetType: input.effect.targetType,
                        targetProductId: input.effect.targetProductId || null, targetFamilyId: input.effect.targetFamilyId || null,
                        value: input.effect.type === "FREE_ITEM" ? null : input.effect.value, targetQuantity: input.effect.targetQuantity,
                    },
                },
            },
        });
        revalidatePath("/admin/settings");
        revalidatePath("/pos");
        return ok();
    } catch (error) {
        console.error("[createPromotion]", error);
        return fail(toUserMessage(error, "No se pudo crear la promoción."));
    }
}

export async function updatePromotion(id: string, input: PromotionInput): Promise<ActionResult> {
    try {
        await requirePermission("MANAGE_CATALOG");
        const error = validate(input);
        if (error) return fail(error);
        await prisma.$transaction(async (tx) => {
            await tx.promotionCondition.deleteMany({ where: { promotionId: id } });
            await tx.promotion.update({
                where: { id },
                data: {
                    name: input.name.trim(),
                    isActive: input.isActive,
                    startDate: input.startDate ? new Date(input.startDate) : null,
                    endDate: input.endDate ? new Date(input.endDate) : null,
                    priority: input.priority,
                    conditions: { create: input.conditions.map((c) => ({ productId: c.productId || null, familyId: c.familyId || null, minQuantity: c.minQuantity })) },
                    effect: {
                        upsert: {
                            create: {
                                type: input.effect.type, targetType: input.effect.targetType,
                                targetProductId: input.effect.targetProductId || null, targetFamilyId: input.effect.targetFamilyId || null,
                                value: input.effect.type === "FREE_ITEM" ? null : input.effect.value, targetQuantity: input.effect.targetQuantity,
                            },
                            update: {
                                type: input.effect.type, targetType: input.effect.targetType,
                                targetProductId: input.effect.targetProductId || null, targetFamilyId: input.effect.targetFamilyId || null,
                                value: input.effect.type === "FREE_ITEM" ? null : input.effect.value, targetQuantity: input.effect.targetQuantity,
                            },
                        },
                    },
                },
            });
        });
        revalidatePath("/admin/settings");
        revalidatePath("/pos");
        return ok();
    } catch (error) {
        console.error("[updatePromotion]", error);
        return fail(toUserMessage(error, "No se pudo actualizar la promoción."));
    }
}

export async function deletePromotion(id: string): Promise<ActionResult> {
    try {
        await requirePermission("MANAGE_CATALOG");
        await prisma.promotion.delete({ where: { id } });
        revalidatePath("/admin/settings");
        revalidatePath("/pos");
        return ok();
    } catch (error) {
        console.error("[deletePromotion]", error);
        return fail(toUserMessage(error, "No se pudo eliminar la promoción."));
    }
}

export async function togglePromotionActive(id: string, isActive: boolean): Promise<ActionResult> {
    try {
        await requirePermission("MANAGE_CATALOG");
        await prisma.promotion.update({ where: { id }, data: { isActive } });
        revalidatePath("/admin/settings");
        revalidatePath("/pos");
        return ok();
    } catch (error) {
        console.error("[togglePromotionActive]", error);
        return fail(toUserMessage(error));
    }
}

export interface PromotionRow {
    id: string;
    name: string;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
    priority: number;
    conditions: { id: string; productId: string | null; productName: string | null; familyId: string | null; familyName: string | null; minQuantity: number }[];
    effect: {
        type: PromotionEffectType; targetType: PromotionTargetType;
        targetProductId: string | null; targetProductName: string | null;
        targetFamilyId: string | null; targetFamilyName: string | null;
        value: number | null; targetQuantity: number;
    } | null;
}

/** Every promotion (active or not) with names resolved, for the admin screen. */
export async function getPromotions(): Promise<PromotionRow[]> {
    try {
        await requirePermission("MANAGE_CATALOG");
        const rows = await prisma.promotion.findMany({
            include: {
                conditions: { include: { product: { select: { name: true } }, family: { select: { name: true } } } },
                effect: { include: { targetProduct: { select: { name: true } }, targetFamily: { select: { name: true } } } },
            },
            orderBy: [{ priority: "asc" }, { name: "asc" }],
        });
        return rows.map((r) => ({
            id: r.id, name: r.name, isActive: r.isActive, priority: r.priority,
            startDate: r.startDate?.toISOString() ?? null, endDate: r.endDate?.toISOString() ?? null,
            conditions: r.conditions.map((c) => ({
                id: c.id, productId: c.productId, productName: c.product?.name ?? null,
                familyId: c.familyId, familyName: c.family?.name ?? null, minQuantity: c.minQuantity,
            })),
            effect: r.effect ? {
                type: r.effect.type as PromotionEffectType, targetType: r.effect.targetType as PromotionTargetType,
                targetProductId: r.effect.targetProductId, targetProductName: r.effect.targetProduct?.name ?? null,
                targetFamilyId: r.effect.targetFamilyId, targetFamilyName: r.effect.targetFamily?.name ?? null,
                value: r.effect.value, targetQuantity: r.effect.targetQuantity,
            } : null,
        }));
    } catch (error) {
        console.error("[getPromotions]", error);
        return [];
    }
}

/**
 * Active promotions in the shape evaluatePromotions() consumes — shared by
 * the POS cart (live preview) and processSale (authoritative recompute), so
 * both always evaluate against exactly the same rules.
 */
export async function getActivePromotionRules(): Promise<PromotionRule[]> {
    try {
        await requireSession();
        const rows = await prisma.promotion.findMany({
            where: { isActive: true },
            include: { conditions: true, effect: true },
            orderBy: [{ priority: "asc" }],
        });
        return rows
            .filter((r) => r.effect)
            .map((r) => ({
                id: r.id, name: r.name, isActive: r.isActive, priority: r.priority,
                startDate: r.startDate?.toISOString() ?? null, endDate: r.endDate?.toISOString() ?? null,
                conditions: r.conditions.map((c) => ({ productId: c.productId, familyId: c.familyId, minQuantity: c.minQuantity })),
                effect: {
                    type: r.effect!.type as PromotionEffectType, targetType: r.effect!.targetType as PromotionTargetType,
                    targetProductId: r.effect!.targetProductId, targetFamilyId: r.effect!.targetFamilyId,
                    value: r.effect!.value, targetQuantity: r.effect!.targetQuantity,
                },
            }));
    } catch (error) {
        console.error("[getActivePromotionRules]", error);
        return [];
    }
}

/** productId -> familyId map for every product that has one — the other
 * half evaluatePromotions() needs to match family-based conditions/effects. */
export async function getProductFamilyMap(): Promise<Record<string, string>> {
    try {
        await requireSession();
        const products = await prisma.product.findMany({ where: { familyId: { not: null } }, select: { id: true, familyId: true } });
        return Object.fromEntries(products.map((p) => [p.id, p.familyId as string]));
    } catch (error) {
        console.error("[getProductFamilyMap]", error);
        return {};
    }
}
