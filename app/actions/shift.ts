"use server";

/**
 * @module shift
 * Server Actions for cashier shift lifecycle: OPEN → CLOSED.
 * One OPEN shift per user and per register at a time.
 * All actions return ActionResult so error messages survive production builds.
 */

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { businessHour } from "@/app/lib/time";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";

export interface ShiftSummary {
    expected: number;
    declared: number;
    difference: number;
    totalSales: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    cancelledCount: number;
    transactionCount: number;
    topProduct: string | null;
    peakHour: number | null;
    userName: string | null;
}

/** Registers available to open a shift on (cashiers need this list). */
export async function getRegistersForShift() {
    try {
        await requireSession();
        const registers = await prisma.register.findMany({
            select: { id: true, name: true, prefix: true, branch: { select: { name: true } } },
            orderBy: { name: "asc" },
        });
        const open = await prisma.shift.findMany({
            where: { status: "OPEN" },
            select: { registerId: true, user: { select: { name: true } } },
        });
        const busy = new Map(open.map((s) => [s.registerId, s.user.name]));
        return registers.map((r) => ({ ...r, busyBy: busy.get(r.id) ?? null }));
    } catch (err) {
        console.error("[getRegistersForShift]", err);
        return [];
    }
}

export async function openShift(baseAmount: number, registerId: string): Promise<ActionResult<{ id: string }>> {
    try {
        const user = await requireSession();

        if (typeof baseAmount !== "number" || !Number.isFinite(baseAmount) || baseAmount < 0) {
            return fail("La base debe ser un número mayor o igual a cero.");
        }
        if (!registerId) return fail("Selecciona una caja.");

        const register = await prisma.register.findUnique({ where: { id: registerId } });
        if (!register) return fail("La caja seleccionada no existe.");

        const existing = await prisma.shift.findFirst({ where: { userId: user.id, status: "OPEN" } });
        if (existing) return fail("Ya tienes un turno abierto. Ciérralo antes de abrir otro.");

        const registerBusy = await prisma.shift.findFirst({
            where: { registerId, status: "OPEN" },
            include: { user: { select: { name: true } } },
        });
        if (registerBusy) return fail(`La caja "${register.name}" ya tiene un turno abierto por ${registerBusy.user.name}.`);

        const newShift = await prisma.shift.create({
            data: { userId: user.id, registerId, baseAmount: Math.round(baseAmount), status: "OPEN" },
        });

        revalidatePath("/pos");
        return ok({ id: newShift.id });
    } catch (err) {
        console.error("[openShift]", err);
        return fail(toUserMessage(err, "No se pudo abrir el turno."));
    }
}

/** Currently OPEN shift for the authenticated user, or null. */
export async function getActiveShift() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const userId = (session.user as { id?: string }).id;
    if (!userId) return null;

    return await prisma.shift.findFirst({
        where: { userId, status: "OPEN" },
        include: {
            register: true,
            _count: { select: { sales: true } },
        },
    });
}

/**
 * Closes the shift and returns the Z-report summary.
 * Expected cash = base + CASH payments of completed sales (cash payments are
 * stored net of change, so no change adjustment is needed).
 */
export async function closeShift(shiftId: string, closeAmount: number): Promise<ActionResult<{ summary: ShiftSummary }>> {
    try {
        const user = await requireSession();

        if (typeof closeAmount !== "number" || !Number.isFinite(closeAmount) || closeAmount < 0) {
            return fail("El monto contado debe ser un número mayor o igual a cero.");
        }

        const shift = await prisma.shift.findUnique({
            where: { id: shiftId },
            include: {
                sales: { include: { details: true, payments: true } },
                user: { select: { name: true } },
            },
        });

        if (!shift || shift.status !== "OPEN") return fail("El turno no está abierto.");
        if (shift.userId !== user.id && user.role !== "ADMIN") return fail("Este turno pertenece a otro usuario.");

        const completed = shift.sales.filter((s) => s.status === "COMPLETED");
        const cancelledCount = shift.sales.length - completed.length;

        let cashSales = 0, cardSales = 0, transferSales = 0;
        for (const sale of completed) {
            for (const p of sale.payments) {
                if (p.method === "CASH") cashSales += p.amount;
                else if (p.method === "CARD") cardSales += p.amount;
                else if (p.method === "TRANSFER") transferSales += p.amount;
            }
        }
        const totalSales = completed.reduce((acc, s) => acc + s.total, 0);
        const expectedAmount = shift.baseAmount + cashSales;
        const difference = closeAmount - expectedAmount;

        const productQty: Record<string, number> = {};
        for (const sale of completed) {
            for (const d of sale.details) productQty[d.productName] = (productQty[d.productName] ?? 0) + d.quantity;
        }
        const topProduct = Object.entries(productQty).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        const hourCount: Record<number, number> = {};
        for (const sale of completed) {
            const h = businessHour(new Date(sale.createdAt));
            hourCount[h] = (hourCount[h] ?? 0) + 1;
        }
        const peakHourEntry = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0] ?? null;
        const peakHour = peakHourEntry ? parseInt(peakHourEntry[0]) : null;

        await prisma.shift.update({
            where: { id: shiftId },
            data: { status: "CLOSED", closeAmount: Math.round(closeAmount), endTime: new Date() },
        });

        revalidatePath("/pos");
        return ok({
            summary: {
                expected: expectedAmount,
                declared: closeAmount,
                difference,
                totalSales,
                cashSales,
                cardSales,
                transferSales,
                cancelledCount,
                transactionCount: completed.length,
                topProduct,
                peakHour,
                userName: shift.user?.name ?? null,
            },
        });
    } catch (err) {
        console.error("[closeShift]", err);
        return fail(toUserMessage(err, "No se pudo cerrar el turno."));
    }
}
