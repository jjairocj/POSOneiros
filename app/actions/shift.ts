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
import { LIVE_SHIFT_STATUSES } from "@/lib/shift-status";
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
    /** The counts as frozen on the server when first submitted — the cashier can't change them afterwards. */
    declared: DeclaredAmounts;
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
            where: { status: { in: LIVE_SHIFT_STATUSES } },
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

        const existing = await prisma.shift.findFirst({ where: { userId: user.id, status: { in: LIVE_SHIFT_STATUSES } } });
        if (existing) return fail(existing.status === "CLOSING" ? "Tu turno está en cierre: termina de cerrarlo antes de abrir otro." : "Ya tienes un turno abierto. Ciérralo antes de abrir otro.");

        const registerBusy = await prisma.shift.findFirst({
            where: { registerId, status: { in: LIVE_SHIFT_STATUSES } },
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
        where: { userId, status: { in: LIVE_SHIFT_STATUSES } },
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
    if (!shift || !LIVE_SHIFT_STATUSES.includes(shift.status as never)) return { error: "El turno no está abierto." } as const;
    if (shift.userId !== user.id && !roleAtLeast(user.role, "SUPERVISOR")) return { error: "Este turno pertenece a otro usuario." } as const;
    return { shift } as const;
}

/** Counts already frozen on an open shift, or null while the cashier hasn't submitted them. */
function lockedCounts(shift: { status: string; closeAmount: number | null; closeCard: number | null; closeTransfer: number | null }): DeclaredAmounts | null {
    if (shift.status !== "CLOSING" || shift.closeAmount == null) return null;
    return { cash: shift.closeAmount, card: shift.closeCard ?? 0, transfer: shift.closeTransfer ?? 0 };
}

/**
 * Already-submitted counts for this shift (null if none yet). Lets the close
 * modal resume straight at the cuadre review after the cashier dismissed it,
 * instead of offering the count form again — expected figures reveal how far
 * off the count was, so a second attempt must never be possible.
 */
export async function getShiftCloseState(shiftId: string): Promise<ActionResult<{ declared: DeclaredAmounts | null }>> {
    try {
        const user = await requireSession();
        const loaded = await loadShiftForClose(shiftId, user);
        if (!loaded.shift) return fail(loaded.error ?? "El turno no está abierto.");
        return ok({ declared: lockedCounts(loaded.shift) });
    } catch (err) {
        console.error("[getShiftCloseState]", err);
        return fail(toUserMessage(err, "No se pudo consultar el cierre."));
    }
}

/**
 * Submits the cashier's count and returns what was expected. The count is
 * FROZEN on the shift at this moment (first submission wins, atomically):
 * later calls — from the UI, a retry after cancelling, or a hand-crafted
 * request — get the original count back and cannot replace it. Expected
 * figures are only revealed together with the freeze, so the count is blind.
 */
export async function getShiftClosePreview(shiftId: string, declaredInput?: DeclaredAmounts): Promise<ActionResult<ShiftClosePreview>> {
    try {
        const user = await requireSession();
        const loaded = await loadShiftForClose(shiftId, user);
        if (!loaded.shift) return fail(loaded.error ?? "El turno no está abierto.");
        const { shift } = loaded;

        let declared = lockedCounts(shift);
        if (!declared) {
            const values = [declaredInput?.cash, declaredInput?.card, declaredInput?.transfer];
            if (values.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
                return fail("Los montos contados deben ser números mayores o iguales a cero.");
            }
            declared = {
                cash: Math.round(declaredInput!.cash),
                card: Math.round(declaredInput!.card),
                transfer: Math.round(declaredInput!.transfer),
            };
            // Only succeeds if nobody froze a count in the meantime. Freezing
            // also moves the shift to CLOSING, so the state is visible everywhere.
            const locked = await prisma.shift.updateMany({
                where: { id: shiftId, status: "OPEN" },
                data: { status: "CLOSING", closeAmount: declared.cash, closeCard: declared.card, closeTransfer: declared.transfer },
            });
            // The shift just became CLOSING: refresh the POS header badge and the admin dashboard.
            if (locked.count > 0) {
                revalidatePath("/pos");
                revalidatePath("/admin");
            }
            if (locked.count === 0) {
                const fresh = await prisma.shift.findUnique({ where: { id: shiftId } });
                const existing = fresh ? lockedCounts(fresh) : null;
                if (!existing) return fail("No se pudo registrar el conteo. Intenta de nuevo.");
                declared = existing;
            }
        }

        const by = salesByMethod(shift.sales);
        return ok({
            baseAmount: shift.baseAmount,
            cashSales: by.cash,
            cardSales: by.card,
            transferSales: by.transfer,
            expectedCash: shift.baseAmount + by.cash,
            declared,
        });
    } catch (err) {
        console.error("[getShiftClosePreview]", err);
        return fail(toUserMessage(err, "No se pudo calcular el cuadre."));
    }
}

/**
 * Closes the shift and returns the Z-report summary, using the counts frozen
 * by getShiftClosePreview.
 * Expected cash = base + CASH payments of completed sales (cash payments are
 * stored net of change, so no change adjustment is needed); card and
 * transfer are compared against their own totals. If ANY declared amount
 * differs from expected a reason (`note`) is required — checked here, not
 * only in the UI.
 */
export async function closeShift(shiftId: string, note?: string): Promise<ActionResult<{ summary: ShiftSummary }>> {
    try {
        const user = await requireSession();

        const loaded = await loadShiftForClose(shiftId, user);
        if (!loaded.shift) return fail(loaded.error ?? "El turno no está abierto.");
        const { shift } = loaded;

        // The count is never accepted here: it must already be frozen by
        // getShiftClosePreview, so nothing typed after seeing the expected
        // figures can end up in the record.
        const declared = lockedCounts(shift);
        if (!declared) return fail("Primero digita el conteo del turno.");

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
            // Counts stay exactly as frozen; only status/note/time are set here.
            data: { status: "CLOSED", closeNote: cleanNote, endTime: new Date() },
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
