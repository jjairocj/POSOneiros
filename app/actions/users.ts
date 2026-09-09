"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireSession, requireAdmin } from "@/lib/auth";
import { toUserMessage } from "@/lib/result";

export async function getUsers() {
    try {
        await requireAdmin();
        const users = await prisma.user.findMany({
            include: {
                role: true,
                branch: true,
            },
            orderBy: { name: "asc" },
        });
        return users.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
            role: {
                ...u.role,
                createdAt: u.role.createdAt.toISOString(),
                updatedAt: u.role.updatedAt.toISOString(),
            },
            branch: u.branch
                ? {
                      ...u.branch,
                      createdAt: u.branch.createdAt.toISOString(),
                      updatedAt: u.branch.updatedAt.toISOString(),
                  }
                : null,
        }));
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    roleId: string;
    branchId?: string;
}) {
    try {
        await requireAdmin();
        const email = data.email?.trim().toLowerCase();
        if (!data.name?.trim()) return { success: false, error: "El nombre es obligatorio." };
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { success: false, error: "Correo inválido." };
        if (!data.password || data.password.length < 6) return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
        if (!data.roleId) return { success: false, error: "Selecciona un rol." };
        data = { ...data, email, name: data.name.trim() };
        const hashedPassword = await bcrypt.hash(data.password, 12);
        await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                roleId: data.roleId,
                branchId: data.branchId || null,
            },
        });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating user:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function updateUser(
    id: string,
    data: {
        name: string;
        email: string;
        password?: string;
        roleId: string;
        branchId?: string;
    }
) {
    try {
        const admin = await requireAdmin();
        if (data.password && data.password.trim() !== "" && data.password.length < 6) {
            return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
        }
        if (admin.id === id) {
            const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
            if (adminRole && data.roleId !== adminRole.id) return { success: false, error: "No puedes quitarte el rol de administrador a ti mismo." };
        }
        const updateData: any = {
            name: data.name,
            email: data.email,
            roleId: data.roleId,
            branchId: data.branchId || null,
        };

        if (data.password && data.password.trim() !== "") {
            updateData.password = await bcrypt.hash(data.password, 12);
        }

        await prisma.user.update({
            where: { id },
            data: updateData,
        });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating user:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function deleteUser(id: string) {
    try {
        const admin = await requireAdmin();
        if (admin.id === id) return { success: false, error: "No puedes eliminar tu propio usuario." };
        // Check that it's not the last admin
        const user = await prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (user?.role.name === "ADMIN") {
            const adminCount = await prisma.user.count({
                where: { role: { name: "ADMIN" } },
            });
            if (adminCount <= 1) {
                return {
                    success: false,
                    error: "No puedes eliminar el último administrador del sistema.",
                };
            }
        }
        const shiftCount = await prisma.shift.count({ where: { userId: id } });
        if (shiftCount > 0) {
            return { success: false, error: "Este usuario tiene turnos registrados y no puede eliminarse. Cambia su contraseña para bloquear el acceso." };
        }
        await prisma.user.delete({ where: { id } });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return { success: false, error: toUserMessage(error) };
    }
}

export async function getRoles() {
    try {
        await requireAdmin();
        const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
        return roles.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        }));
    } catch (error) {
        console.error("Error fetching roles:", error);
        return [];
    }
}

export async function getBranches() {
    try {
        await requireAdmin();
        const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
        return branches.map((b) => ({
            ...b,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
        }));
    } catch (error) {
        console.error("Error fetching branches:", error);
        return [];
    }
}


/** Any signed-in user can change their own password after proving the current one. */
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
    try {
        const me = await requireSession();
        if (!newPassword || newPassword.length < 6) return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
        if (newPassword === currentPassword) return { success: false, error: "La nueva contraseña debe ser distinta a la actual." };

        const user = await prisma.user.findUnique({ where: { id: me.id } });
        if (!user) return { success: false, error: "Usuario no encontrado." };
        const valid = await bcrypt.compare(currentPassword ?? "", user.password);
        if (!valid) return { success: false, error: "La contraseña actual no es correcta." };

        await prisma.user.update({ where: { id: me.id }, data: { password: await bcrypt.hash(newPassword, 12) } });
        return { success: true };
    } catch (error: any) {
        console.error("Error changing password:", error);
        return { success: false, error: toUserMessage(error) };
    }
}
