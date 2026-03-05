"use server";
import prisma from "../../lib/prisma";

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
