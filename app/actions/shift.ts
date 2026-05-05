"use server";

/**
 * @module shift
 * @description Server Actions for cashier shift lifecycle management.
 *
 * A shift (turno) is the unit of work for a cashier. It has three lifecycle
 * states: OPEN → (work) → CLOSED. Only one OPEN shift per user is allowed at
 * a time (enforced by `getActiveShift` returning the first match).
 *
 * All actions require an active NextAuth session. Unauthenticated calls throw
 * "No autenticado" so the client can surface a friendly error.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Opens a new shift for the authenticated cashier.
 *
 * @param baseAmount - Starting cash float placed in the register drawer.
 * @param registerId - ID of the physical register (caja) being opened.
 * @returns The newly created Shift record.
 * @throws {Error} "No autenticado" if no valid session exists.
 */
export async function openShift(baseAmount: number, registerId: string) {
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
 * Returns the currently OPEN shift for the authenticated user, or null if none
 * exists or the user is unauthenticated.
 *
 * Includes:
 * - `register` relation — used by ShiftHeader to display the register name.
 * - `_count.sales`     — used by ShiftHeader to display the sale counter badge.
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
            _count: { select: { sales: true } },
        },
    });
}

/**
 * Closes the specified shift and returns a narrative summary for the Z-report.
 *
 * The summary powers the ShiftClosingModal's storytelling view:
 * - `totalSales`       — sum of all sale totals in the shift
 * - `transactionCount` — number of individual sales
 * - `topProduct`       — name of the product with the highest total quantity sold
 * - `peakHour`         — 0–23 hour with the most transactions
 * - `userName`         — full name of the cashier (used in the closing message)
 * - `expected`         — baseAmount + totalSales (what should be in the drawer)
 * - `declared`         — what the cashier reported counting
 * - `difference`       — declared − expected (negative = shortage, positive = surplus)
 *
 * @param shiftId     - ID of the shift to close.
 * @param closeAmount - Cash amount the cashier physically counted in the drawer.
 * @returns `{ shift, summary }` — the updated shift record and narrative data.
 * @throws {Error} "No autenticado" if no valid session.
 * @throws {Error} "Turno inválido o no activo" if the shift is not OPEN or
 *   does not belong to the authenticated user.
 */
export async function closeShift(shiftId: string, closeAmount: number) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        throw new Error("No autenticado");
    }

    const userId = (session.user as any).id;

    const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
            sales: {
                include: {
                    details: { include: { product: { select: { name: true } } } },
                },
            },
            user: { select: { name: true } },
        },
    });

    if (!shift || shift.userId !== userId || shift.status !== "OPEN") {
        throw new Error("Turno inválido o no activo");
    }

    const totalSales = shift.sales.reduce((acc, sale) => acc + sale.total, 0);
    const expectedAmount = shift.baseAmount + totalSales;
    const difference = closeAmount - expectedAmount;

    // Top product by quantity sold across all sale details
    const productQty: Record<string, { name: string; qty: number }> = {};
    for (const sale of shift.sales) {
        for (const detail of sale.details) {
            const name = detail.product.name;
            if (!productQty[name]) productQty[name] = { name, qty: 0 };
            productQty[name].qty += detail.quantity;
        }
    }
    const topProduct = Object.values(productQty).sort((a, b) => b.qty - a.qty)[0] ?? null;

    // Peak hour (0–23) by number of completed sales in that hour
    const hourCount: Record<number, number> = {};
    for (const sale of shift.sales) {
        const h = new Date(sale.createdAt).getHours();
        hourCount[h] = (hourCount[h] ?? 0) + 1;
    }
    const peakHourEntry = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0] ?? null;
    const peakHour = peakHourEntry ? parseInt(peakHourEntry[0]) : null;

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
            transactionCount: shift.sales.length,
            topProduct: topProduct?.name ?? null,
            peakHour,
            userName: shift.user?.name ?? null,
        },
    };
}
