"use server";
import prisma from "../../lib/prisma";

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
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
