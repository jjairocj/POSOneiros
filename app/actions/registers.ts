"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRegisters() {
    try {
        const registers = await prisma.register.findMany({
            include: { branch: true },
            orderBy: { name: "asc" },
        });
        return registers.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            branch: {
                ...r.branch,
                createdAt: r.branch.createdAt.toISOString(),
                updatedAt: r.branch.updatedAt.toISOString(),
            },
        }));
    } catch (error) {
        console.error("Error fetching registers:", error);
        return [];
    }
}

export async function createRegister(data: {
    name: string;
    prefix?: string;
    branchId: string;
}) {
    try {
        await prisma.register.create({
            data: {
                name: data.name,
                prefix: data.prefix || null,
                branchId: data.branchId,
            },
        });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating register:", error);
        return { success: false, error: error.message };
    }
}

export async function updateRegister(
    id: string,
    data: { name: string; prefix?: string; branchId: string }
) {
    try {
        await prisma.register.update({
            where: { id },
            data: {
                name: data.name,
                prefix: data.prefix || null,
                branchId: data.branchId,
            },
        });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating register:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteRegister(id: string) {
    try {
        const activeShift = await prisma.shift.findFirst({
            where: { registerId: id, status: "OPEN" },
        });
        if (activeShift) {
            return {
                success: false,
                error: "No puedes eliminar una caja con un turno activo.",
            };
        }
        await prisma.register.delete({ where: { id } });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting register:", error);
        return { success: false, error: error.message };
    }
}
