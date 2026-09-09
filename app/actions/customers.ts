"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";

export interface CustomerResult {
    id: string;
    fullName: string;
    documentId: string | null;
    phone: string | null;
    email: string | null;
}

export async function searchCustomers(query: string): Promise<CustomerResult[]> {
    if (!query || query.trim().length < 2) return [];
    try { await requireSession(); } catch { return []; }
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
}): Promise<ActionResult<CustomerResult>> {
  try {
    await requireSession();
    if (!data.fullName?.trim()) return fail("El nombre del cliente es obligatorio.");
    if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email.trim())) return fail("Correo inválido.");
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
    return ok(customer);
  } catch (err) {
    console.error("[createCustomer]", err);
    return fail(toUserMessage(err, "No se pudo crear el cliente."));
  }
}
