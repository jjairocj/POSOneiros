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
