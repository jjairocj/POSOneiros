"use server";

/**
 * @module shift
 * Server Actions for cashier shift lifecycle: OPEN → CLOSED.
 * One OPEN shift per user and per register at a time.
 * All actions return ActionResult so error messages survive production builds.
 */

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession, roleAtLeast } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { businessHour } from "@/app/lib/time";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";

/** Expected (from recorded sales) vs what the cashier counted, per payment method. */
export interface MethodReconciliation {
    expected: number;
    declared: number;
    difference: number;
}

/** What the cashier counted at close. Card = datáfono total, transfer = Nequi/Daviplata etc. */
export interface DeclaredAmounts {
    cash: number;
    card: number;
    transfer: number;
}

/** Shown on the review step of the close flow, BEFORE closing. */
export interface ShiftClosePreview {
    baseAmount: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    /** Cash the drawer should hold: base + cash sales. */
    expectedCash: number;
}

export interface ShiftSummary {
    // Cash reconciliation (kept flat — the drawer count is the headline number).
    expected: number;
    declared: number;
    difference: number;
    baseAmount: number;
    card: MethodReconciliation;
    transfer: MethodReconciliation;
    note: string | null;
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

/** Sums a shift's completed sales by payment method (payments are stored net of change). */
function salesByMethod(sales: { status: string; total: number; payments: { method: string; amount: number }[] }[]) {
    let cash = 0, card = 0, transfer = 0;
    for (const sale of sales) {
        if (sale.status !== "COMPLETED") continue;
        for (const p of sale.payments) {
            if (p.method === "CASH") cash += p.amount;
            else if (p.method === "CARD") card += p.amount;
            else if (p.method === "TRANSFER") transfer += p.amount;
        }
    }
    return { cash, card, transfer };
}

async function loadShiftForClose(shiftId: string, user: Awaited<ReturnType<typeof requireSession>>) {
    const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
            sales: { include: { details: true, payments: true } },
            user: { select: { name: true } },
        },
    });
    if (!shift || shift.status !== "OPEN") return { error: "El turno no está abierto." } as const;
    if (shift.userId !== user.id && !roleAtLeast(user.role, "SUPERVISOR")) return { error: "Este turno pertenece a otro usuario." } as const;
    return { shift } as const;
}

/**
 * Numbers the cashier is compared against on the review step of the close
 * flow. Fetched only after they've typed their counts, so the count itself
 * stays blind (they can't just copy the expected figures).
 */
export async function getShiftClosePreview(shiftId: string): Promise<ActionResult<ShiftClosePreview>> {
    try {
        const user = await requireSession();
        const loaded = await loadShiftForClose(shiftId, user);
        if (!loaded.shift) return fail(loaded.error ?? "El turno no está abierto.");
        const { shift } = loaded;
        const by = salesByMethod(shift.sales);
        return ok({
            baseAmount: shift.baseAmount,
            cashSales: by.cash,
            cardSales: by.card,
            transferSales: by.transfer,
            expectedCash: shift.baseAmount + by.cash,
        });
    } catch (err) {
        console.error("[getShiftClosePreview]", err);
        return fail(toUserMessage(err, "No se pudo calcular el cuadre."));
    }
}

/**
 * Closes the shift and returns the Z-report summary.
 * Expected cash = base + CASH payments of completed sales (cash payments are
 * stored net of change, so no change adjustment is needed); card and
 * transfer are compared against their own totals. If ANY declared amount
 * differs from expected a reason (`note`) is required — checked here, not
 * only in the UI.
 */
export async function closeShift(shiftId: string, declaredInput: DeclaredAmounts, note?: string): Promise<ActionResult<{ summary: ShiftSummary }>> {
    try {
        const user = await requireSession();

        const values = [declaredInput?.cash, declaredInput?.card, declaredInput?.transfer];
        if (values.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
            return fail("Los montos contados deben ser números mayores o iguales a cero.");
        }
        const declared: DeclaredAmounts = {
            cash: Math.round(declaredInput.cash),
            card: Math.round(declaredInput.card),
            transfer: Math.round(declaredInput.transfer),
        };

        const loaded = await loadShiftForClose(shiftId, user);
        if (!loaded.shift) return fail(loaded.error ?? "El turno no está abierto.");
        const { shift } = loaded;

        const completed = shift.sales.filter((s) => s.status === "COMPLETED");
        const cancelledCount = shift.sales.length - completed.length;

        const by = salesByMethod(shift.sales);
        const totalSales = completed.reduce((acc, s) => acc + s.total, 0);
        const expectedAmount = shift.baseAmount + by.cash;
        const difference = declared.cash - expectedAmount;
        const cardDifference = declared.card - by.card;
        const transferDifference = declared.transfer - by.transfer;

        const cleanNote = note?.trim() || null;
        if ((difference !== 0 || cardDifference !== 0 || transferDifference !== 0) && !cleanNote) {
            return fail("Hay un descuadre: escribe el motivo para poder cerrar el turno.");
        }

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
            data: {
                status: "CLOSED",
                closeAmount: declared.cash,
                closeCard: declared.card,
                closeTransfer: declared.transfer,
                closeNote: cleanNote,
                endTime: new Date(),
            },
        });

        revalidatePath("/pos");
        return ok({
            summary: {
                expected: expectedAmount,
                declared: declared.cash,
                difference,
                baseAmount: shift.baseAmount,
                card: { expected: by.card, declared: declared.card, difference: cardDifference },
                transfer: { expected: by.transfer, declared: declared.transfer, difference: transferDifference },
                note: cleanNote,
                totalSales,
                cashSales: by.cash,
                cardSales: by.card,
                transferSales: by.transfer,
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
