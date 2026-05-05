"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getUsers() {
    try {
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
        return { success: false, error: error.message };
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
        return { success: false, error: error.message };
    }
}

export async function deleteUser(id: string) {
    try {
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
        await prisma.user.delete({ where: { id } });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return { success: false, error: error.message };
    }
}

export async function getRoles() {
    try {
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
