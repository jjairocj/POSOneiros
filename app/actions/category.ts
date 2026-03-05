"use server";
import prisma from "../../lib/prisma";

export async function getCategories() {
    try {
        return await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
}
