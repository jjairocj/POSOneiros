"use server";
import prisma from "../../lib/prisma";

export async function getProducts(categoryId?: string, search?: string) {
    try {
        return await prisma.product.findMany({
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
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}
