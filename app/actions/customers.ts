"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CustomerResult {
    id: string;
    fullName: string;
    documentId: string | null;
    phone: string | null;
    email: string | null;
}

export async function searchCustomers(query: string): Promise<CustomerResult[]> {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();
    return prisma.customer.findMany({
        where: {
            OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { documentId: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
            ],
        },
        select: { id: true, fullName: true, documentId: true, phone: true, email: true },
        take: 8,
        orderBy: { fullName: "asc" },
    });
}

export async function createCustomer(data: {
    fullName: string;
    documentId?: string;
    phone?: string;
    email?: string;
}): Promise<CustomerResult> {
    const customer = await prisma.customer.create({
        data: {
            fullName: data.fullName.trim(),
            documentId: data.documentId?.trim() || null,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
        },
        select: { id: true, fullName: true, documentId: true, phone: true, email: true },
    });
    revalidatePath("/admin/customers");
    return customer;
}
