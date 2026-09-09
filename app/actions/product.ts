"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession, requireAdmin } from "@/lib/auth";
import { toUserMessage } from "@/lib/result";

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
    return { data: { name, code, price, cost, stock, taxIva, taxIca, taxImpoConsumo, imageUrl, isFavorite, isActive, categoryId } } as const;
}

export async function createProduct(formData: FormData) {
    try {
        await requireAdmin();
        const parsed = parseProductForm(formData);
        if ("error" in parsed) return { success: false, error: parsed.error };
        await prisma.product.create({ data: parsed.data });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating product:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function updateProduct(id: string, formData: FormData) {
    try {
        await requireAdmin();
        const parsed = parseProductForm(formData);
        if ("error" in parsed) return { success: false, error: parsed.error };
        await prisma.product.update({ where: { id }, data: parsed.data });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function deleteProduct(id: string) {
    try {
        await requireAdmin();
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
    } catch (error: any) {
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
    } catch (error: any) {
        console.error("Error toggling favorite:", error);
        return { success: false, error: toUserMessage(error) };
    }
}
