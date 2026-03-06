"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ]
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
        const name = formData.get("name") as string;
        const sortOrder = Number(formData.get("sortOrder") || 0);

        await prisma.category.create({
            data: { name, sortOrder }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating category:", error);
        return { success: false, error: error.message };
    }
}

export async function updateCategory(id: string, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const sortOrder = Number(formData.get("sortOrder") || 0);

        await prisma.category.update({
            where: { id },
            data: { name, sortOrder }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating category:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteCategory(id: string) {
    try {
        await prisma.category.delete({
            where: { id }
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/pos");
        return { success: true };
    } catch (error: any) {
        // If there are linked products, it will fail
        console.error("Error deleting category:", error);
        return { success: false, error: "No se puede eliminar una categoría que contiene productos." };
    }
}
