"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";

export interface SupplierRow {
    id: string;
    name: string;
    taxId: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
    /** No product lot or raw-material lot ever pointed at this supplier —
     * safe to hard-delete instead of just deactivating. */
    canDelete: boolean;
}

/** Every supplier, active first — used both by the management screen and the
 * lot-receiving dropdowns (which only show active ones). */
export async function getSuppliers(): Promise<SupplierRow[]> {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: { _count: { select: { productLots: true, rawMaterialLots: true } } },
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
        });
        return suppliers.map((s) => ({
            id: s.id, name: s.name, taxId: s.taxId, phone: s.phone,
            email: s.email, address: s.address, notes: s.notes, isActive: s.isActive,
            canDelete: s._count.productLots === 0 && s._count.rawMaterialLots === 0,
        }));
    } catch (error) {
        console.error("[getSuppliers]", error);
        return [];
    }
}

/** Hard delete — only possible when the supplier was never actually used on
 * any lot (see canDelete above); otherwise use toggleSupplierActive so
 * historical lots keep a name to point at. */
export async function deleteSupplier(id: string): Promise<ActionResult> {
    try {
        await requirePermission("MANAGE_CATALOG");
        const [productLots, rawMaterialLots] = await Promise.all([
            prisma.productLot.count({ where: { supplierId: id } }),
            prisma.rawMaterialLot.count({ where: { supplierId: id } }),
        ]);
        if (productLots > 0 || rawMaterialLots > 0) {
            return fail("Este proveedor ya tiene lotes registrados — desactívalo en vez de eliminarlo.");
        }
        await prisma.supplier.delete({ where: { id } });
        revalidatePath("/admin/inventory");
        return ok();
    } catch (error) {
        console.error("[deleteSupplier]", error);
        return fail(toUserMessage(error, "No se pudo eliminar el proveedor."));
    }
}

function readSupplierFields(formData: FormData) {
    return {
        name: String(formData.get("name") ?? "").trim(),
        taxId: String(formData.get("taxId") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        email: String(formData.get("email") ?? "").trim() || null,
        address: String(formData.get("address") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
    };
}

export async function createSupplier(formData: FormData): Promise<ActionResult> {
    try {
        await requirePermission("MANAGE_CATALOG");
        const data = readSupplierFields(formData);
        if (!data.name) return fail("El nombre es obligatorio.");
        await prisma.supplier.create({ data });
        revalidatePath("/admin/inventory");
        return ok();
    } catch (error) {
        console.error("[createSupplier]", error);
        return fail(toUserMessage(error, "No se pudo crear el proveedor."));
    }
}

export async function updateSupplier(id: string, formData: FormData): Promise<ActionResult> {
    try {
        await requirePermission("MANAGE_CATALOG");
        const data = readSupplierFields(formData);
        if (!data.name) return fail("El nombre es obligatorio.");
        await prisma.supplier.update({ where: { id }, data });
        revalidatePath("/admin/inventory");
        return ok();
    } catch (error) {
        console.error("[updateSupplier]", error);
        return fail(toUserMessage(error, "No se pudo actualizar el proveedor."));
    }
}

/** Soft toggle, not a delete — historical lots keep pointing at this supplier
 * for traceability even after the business stops buying from them. */
export async function toggleSupplierActive(id: string, isActive: boolean): Promise<ActionResult> {
    try {
        await requirePermission("MANAGE_CATALOG");
        await prisma.supplier.update({ where: { id }, data: { isActive } });
        revalidatePath("/admin/inventory");
        return ok();
    } catch (error) {
        console.error("[toggleSupplierActive]", error);
        return fail(toUserMessage(error));
    }
}
