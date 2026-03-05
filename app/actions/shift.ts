"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Server Action to open a shift.
 * Must be called from a Client Component via a transition or a simple call.
 */
export async function openShift(baseAmount: number, registerId: string) {
    // Since this is a server action, it runs on the server.
    // We need to re-fetch the session or pass the user ID.
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        throw new Error("No autenticado");
    }

    const userId = (session.user as any).id;

    const newShift = await prisma.shift.create({
        data: {
            userId,
            registerId,
            baseAmount,
            status: "OPEN",
        },
    });

    revalidatePath("/pos");
    return newShift;
}

/**
 * Get the active shift for the current user.
 */
export async function getActiveShift() {
    const session = await getServerSession(authOptions);

    if (!session?.user) return null;

    const userId = (session.user as any).id;

    return await prisma.shift.findFirst({
        where: {
            userId,
            status: "OPEN",
        },
        include: {
            register: true,
        },
    });
}

/**
 * Server Action to close an active shift.
 */
export async function closeShift(shiftId: string, closeAmount: number) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        throw new Error("No autenticado");
    }

    const userId = (session.user as any).id;

    const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: { sales: true }
    });

    if (!shift || shift.userId !== userId || shift.status !== "OPEN") {
        throw new Error("Turno inválido o no activo");
    }

    // Calcular el total esperado (Base + Sumatoria de Ventas en efectivo)
    // Asumiendo que las ventas en sales[] tienen un campo 'total' y que 
    // todas las ventas actuales van al efectivo. (Filtros de Payment method 
    // se agregarán en la Epic 3).
    const totalSales = shift.sales.reduce((acc, sale) => acc + sale.total, 0);
    const expectedAmount = shift.baseAmount + totalSales;
    const difference = closeAmount - expectedAmount;

    const closedShift = await prisma.shift.update({
        where: { id: shiftId },
        data: {
            status: "CLOSED",
            closeAmount,
            endTime: new Date(),
        },
    });

    revalidatePath("/pos");
    return {
        shift: closedShift,
        summary: {
            expected: expectedAmount,
            declared: closeAmount,
            difference,
            totalSales,
        }
    };
}
