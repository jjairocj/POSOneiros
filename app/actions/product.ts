"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/lib/auth";
import { toUserMessage, UserError } from "@/lib/result";

export async function getProducts(categoryId?: string, search?: string, opts: { includeInactive?: boolean } = {}) {
    try {
        await requireSession();
        const products = await prisma.product.findMany({
            where: {
                AND: [
                    opts.includeInactive ? {} : { isActive: true },
                    categoryId === 'favorites' ? { isFavorite: true } :
                    categoryId === 'all' ? {} :
                    categoryId === 'uncategorized' ? { categoryId: null } :
                    categoryId ? { categoryId } : {},
                    search ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { code: { contains: search, mode: 'insensitive' } }
                        ]
                    } : {}
                ]
            },
            include: {
                category: true
            },
            orderBy: { name: 'asc' }
        });

        // Serialize Dates to strings for Client Component compatibility
        return products.map(p => ({
            ...p,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
            category: p.category ? {
                ...p.category,
                createdAt: p.category.createdAt.toISOString(),
                updatedAt: p.category.updatedAt.toISOString(),
            } : null
        }));
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

function parseProductForm(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const code = String(formData.get("code") ?? "").trim();
    const num = (key: string, fallback = 0) => {
        const raw = formData.get(key);
        if (raw === null || raw === "") return fallback;
        const n = Number(raw);
        return Number.isFinite(n) ? n : NaN;
    };
    const price = num("price"), cost = num("cost"), stock = num("stock");
    const taxIva = num("taxIva"), taxIca = num("taxIca"), taxImpoConsumo = num("taxImpoConsumo");

    if (!name) return { error: "El nombre es obligatorio." } as const;
    if (!code) return { error: "El código es obligatorio." } as const;
    if ([price, cost, stock, taxIva, taxIca, taxImpoConsumo].some((n) => Number.isNaN(n))) return { error: "Hay un valor numérico inválido." } as const;
    if (price < 0 || cost < 0) return { error: "Precio y costo no pueden ser negativos." } as const;
    if ([taxIva, taxIca, taxImpoConsumo].some((t) => t < 0 || t > 100)) return { error: "Los impuestos son porcentajes entre 0 y 100." } as const;

    const imageUrl = formData.get("imageUrl")?.toString().trim() || null;
    const isFavorite = formData.get("isFavorite") === "true";
    const isActive = formData.get("isActive") === null ? true : formData.get("isActive") === "true";
    const rawCategory = formData.get("categoryId")?.toString().trim();
    const categoryId = rawCategory && rawCategory !== "none" ? rawCategory : null;
    const rawTracking = formData.get("trackingMode")?.toString().trim();
    const trackingMode = ["SIMPLE", "LOT", "NONE"].includes(rawTracking ?? "") ? rawTracking! : "SIMPLE";
    return { data: { name, code, price, cost, stock, taxIva, taxIca, taxImpoConsumo, imageUrl, isFavorite, isActive, categoryId, trackingMode } } as const;
}

export async function createProduct(formData: FormData) {
    try {
        await requirePermission("MANAGE_CATALOG");
        const parsed = parseProductForm(formData);
        if ("error" in parsed) return { success: false, error: parsed.error };
        await prisma.product.create({ data: parsed.data });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error creating product:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function updateProduct(id: string, formData: FormData) {
    try {
        const manager = await requirePermission("MANAGE_CATALOG");
        const parsed = parseProductForm(formData);
        if ("error" in parsed) return { success: false, error: parsed.error };
        await prisma.$transaction(async (tx) => {
            const before = await tx.product.findUnique({ where: { id }, select: { stock: true } });
            const updated = await tx.product.update({ where: { id }, data: parsed.data });
            const delta = updated.stock - (before?.stock ?? 0);
            if (delta !== 0) {
                await tx.stockMovement.create({
                    data: { productId: id, type: "ADJUSTMENT", quantity: delta, stockAfter: updated.stock, userId: manager.id, reason: "Edición manual del producto" },
                });
            }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error updating product:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function deleteProduct(id: string) {
    try {
        await requirePermission("MANAGE_CATALOG");
        const salesCount = await prisma.saleDetail.count({ where: { productId: id } });
        if (salesCount > 0) {
            // Keep history intact: deactivate instead of deleting.
            await prisma.product.update({ where: { id }, data: { isActive: false, isFavorite: false } });
        } else {
            await prisma.product.delete({ where: { id } });
        }
        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error deleting product:", error);
        return { success: false, error: toUserMessage(error, "No se pudo eliminar el producto.") };
    }
}

export async function toggleProductFavorite(id: string, isFavorite: boolean) {
    try {
        await requireSession();
        await prisma.product.update({
            where: { id },
            data: { isFavorite }
        });
        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error toggling favorite:", error);
        return { success: false, error: toUserMessage(error) };
    }
}


export type MovementType = "PURCHASE" | "ADJUSTMENT" | "WASTE";

/**
 * Manual stock movement from the inventory screen.
 * PURCHASE adds units (and can update the cost), WASTE removes them,
 * ADJUSTMENT sets a correction in either direction.
 */
export async function adjustStock(input: { productId: string; type: MovementType; quantity: number; reason?: string; unitCost?: number }) {
    try {
        const manager = await requirePermission("RECEIVE_INVENTORY");
        const qty = Number(input.quantity);
        if (!Number.isFinite(qty) || qty === 0) return { success: false, error: "La cantidad debe ser distinta de cero." };
        if (input.type === "PURCHASE" && qty < 0) return { success: false, error: "Una entrada no puede ser negativa." };
        if (input.type === "WASTE" && qty < 0) return { success: false, error: "Indica la cantidad de merma en positivo." };
        if ((input.type === "WASTE" || input.type === "ADJUSTMENT") && !(input.reason ?? "").trim()) {
            return { success: false, error: "Escribe el motivo." };
        }
        const signed = input.type === "WASTE" ? -Math.abs(qty) : qty;

        await prisma.$transaction(async (tx) => {
            if (input.type === "PURCHASE") {
                const product = await tx.product.findUnique({ where: { id: input.productId }, select: { trackingMode: true } });
                if (product?.trackingMode === "LOT") {
                    throw new UserError('Este producto usa seguimiento por lote: registra la entrada con "Recibir lote".');
                }
            }
            const data: { stock: { increment: number }; cost?: number } = { stock: { increment: signed } };
            if (input.type === "PURCHASE" && input.unitCost !== undefined && Number.isFinite(input.unitCost) && input.unitCost >= 0) {
                data.cost = input.unitCost;
            }
            const p = await tx.product.update({ where: { id: input.productId }, data });
            await tx.stockMovement.create({
                data: {
                    productId: input.productId, type: input.type, quantity: signed, stockAfter: p.stock,
                    unitCost: input.type === "PURCHASE" ? input.unitCost ?? null : null,
                    reason: input.reason?.trim() || null, userId: manager.id,
                },
            });
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/admin");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error adjusting stock:", error);
        return { success: false, error: toUserMessage(error, "No se pudo registrar el movimiento.") };
    }
}

export interface MovementRow {
    id: string;
    createdAt: string;
    type: string;
    quantity: number;
    stockAfter: number;
    unitCost: number | null;
    reason: string | null;
    saleId: string | null;
    productId: string;
    productName: string;
    productCode: string;
    userName: string | null;
}

/** Latest stock movements, optionally for one product. */
export async function getStockMovements(opts: { productId?: string; take?: number } = {}): Promise<MovementRow[]> {
    try {
        await requirePermission("RECEIVE_INVENTORY");
        const rows = await prisma.stockMovement.findMany({
            where: opts.productId ? { productId: opts.productId } : {},
            orderBy: { createdAt: "desc" },
            take: Math.min(opts.take ?? 200, 1000),
            include: { product: { select: { name: true, code: true } } },
        });
        const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((u): u is string => !!u)));
        const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
        const nameById = new Map(users.map((u) => [u.id, u.name]));
        return rows.map((r) => ({
            id: r.id, createdAt: r.createdAt.toISOString(), type: r.type, quantity: r.quantity, stockAfter: r.stockAfter,
            unitCost: r.unitCost, reason: r.reason, saleId: r.saleId, productId: r.productId,
            productName: r.product.name, productCode: r.product.code, userName: r.userId ? nameById.get(r.userId) ?? null : null,
        }));
    } catch (error) {
        console.error("Error fetching movements:", error);
        return [];
    }
}
