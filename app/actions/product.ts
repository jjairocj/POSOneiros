"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProducts(categoryId?: string, search?: string) {
    try {
        const products = await prisma.product.findMany({
            where: {
                AND: [
                    categoryId && categoryId !== 'all' ? { categoryId } : {},
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

export async function createProduct(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const code = formData.get("code") as string;
        const price = Number(formData.get("price"));
        const cost = Number(formData.get("cost"));
        const stock = Number(formData.get("stock"));
        const taxIva = Number(formData.get("taxIva") || 0);
        const taxIca = Number(formData.get("taxIca") || 0);
        const taxImpoConsumo = Number(formData.get("taxImpoConsumo") || 0);
        const imageUrl = formData.get("imageUrl")?.toString() || null;
        const isFavorite = formData.get("isFavorite") === "true";

        await prisma.product.create({
            data: {
                name,
                code,
                price,
                cost,
                stock,
                taxIva,
                taxIca,
                taxImpoConsumo,
                imageUrl,
                isFavorite
            }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating product:", error);
        return { success: false, error: error.message };
    }
}

export async function updateProduct(id: string, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const code = formData.get("code") as string;
        const price = Number(formData.get("price"));
        const cost = Number(formData.get("cost"));
        const stock = Number(formData.get("stock"));
        const taxIva = Number(formData.get("taxIva") || 0);
        const taxIca = Number(formData.get("taxIca") || 0);
        const taxImpoConsumo = Number(formData.get("taxImpoConsumo") || 0);
        const imageUrl = formData.get("imageUrl")?.toString() || null;
        const isFavorite = formData.get("isFavorite") === "true";

        await prisma.product.update({
            where: { id },
            data: {
                name,
                code,
                price,
                cost,
                stock,
                taxIva,
                taxIca,
                taxImpoConsumo,
                imageUrl,
                isFavorite
            }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({
            where: { id }
        });
        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting product:", error);
        return { success: false, error: "No se puede eliminar un producto con ventas asociadas." };
    }
}
