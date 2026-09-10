"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession, requireManager } from "@/lib/auth";
import { toUserMessage } from "@/lib/result";

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ],
            include: {
                _count: { select: { products: true } },
            },
        });

        return categories.map(c => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        }));
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
}

export async function createCategory(formData: FormData) {
    try {
        await requireManager();
        const name = String(formData.get("name") ?? "").trim();
        if (!name) return { success: false, error: "El nombre es obligatorio." };
        const sortOrder = Number(formData.get("sortOrder") || 0);

        await prisma.category.create({
            data: { name, sortOrder }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error creating category:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function updateCategory(id: string, formData: FormData) {
    try {
        await requireManager();
        const name = String(formData.get("name") ?? "").trim();
        if (!name) return { success: false, error: "El nombre es obligatorio." };
        const sortOrder = Number(formData.get("sortOrder") || 0);

        await prisma.category.update({
            where: { id },
            data: { name, sortOrder }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error updating category:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function deleteCategory(id: string) {
    try {
        await requireManager();
        await prisma.category.delete({
            where: { id }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        // If there are linked products, it will fail
        console.error("Error deleting category:", error);
        return { success: false, error: toUserMessage(error, "No se puede eliminar una categoría que contiene productos.") };
    }
}

export async function updateCategoryOrders(updates: { id: string, sortOrder: number }[]) {
    try {
        await requireManager();
        // Use a transaction to update all sorting orders atomically
        await prisma.$transaction(
            updates.map((update) =>
                prisma.category.update({
                    where: { id: update.id },
                    data: { sortOrder: update.sortOrder }
                })
            )
        );

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error updating category orders:", error);
        return { success: false, error: toUserMessage(error, "Error al reordenar las categorías.") };
    }
}
