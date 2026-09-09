"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { fail, ok, toUserMessage, UserError, type ActionResult } from "@/lib/result";

export interface SaleLineInput {
    id: string;
    quantity: number;
}

export interface PaymentInput {
    method: "CASH" | "CARD" | "TRANSFER";
    amount: number;
    /** Label of the person paying when the bill is split. */
    subAccountLabel?: string;
}

export interface SubAccountInput {
    label: string;
    items: SaleLineInput[];
    amount: number;
}

export interface ProcessSaleOptions {
    customerId?: string;
    /** Legacy single-label sub account (item-based split, one sale per person). */
    subAccountLabel?: string;
    /** Equal / custom split: one sale, several payers. */
    subAccounts?: SubAccountInput[];
}

export type SaleWithDetails = Prisma.SaleGetPayload<{
    include: { details: { include: { product: true } }; payments: true; shift: { include: { register: true } } };
}>;

const PAYMENT_METHODS = new Set(["CASH", "CARD", "TRANSFER"]);
const isMoney = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const round = (n: number) => Math.round(n);

/**
 * Registers a sale. Server is the source of truth for prices and taxes;
 * the client only sends product ids, quantities and how it was paid.
 *
 * Guarantees:
 * - quantities are positive finite numbers
 * - products exist and are active
 * - stock is decremented atomically (no oversell under concurrency) unless
 *   the "allowNegativeStock" setting is on
 * - payments add up to the computed total (within $1 rounding)
 * - a consecutive number per register is assigned inside the transaction
 */
export async function processSale(
    activeShiftId: string,
    items: SaleLineInput[],
    payments: PaymentInput[],
    options: ProcessSaleOptions = {}
): Promise<ActionResult<SaleWithDetails>> {
    try {
        const user = await requireSession();

        // ── Input validation ────────────────────────────────────────────
        if (!Array.isArray(items) || items.length === 0) return fail("El carrito está vacío.");
        if (!Array.isArray(payments) || payments.length === 0) return fail("No se registró ningún pago.");

        for (const line of items) {
            if (!line?.id || typeof line.id !== "string") return fail("Producto inválido en el carrito.");
            if (typeof line.quantity !== "number" || !Number.isFinite(line.quantity) || line.quantity <= 0) {
                return fail("Las cantidades deben ser mayores a cero.");
            }
        }
        for (const p of payments) {
            if (!PAYMENT_METHODS.has(p?.method)) return fail("Método de pago inválido.");
            if (!isMoney(p.amount) || p.amount <= 0) return fail("Los importes de pago deben ser mayores a cero.");
        }

        // Merge duplicated lines for the same product
        const qtyByProduct = new Map<string, number>();
        for (const line of items) qtyByProduct.set(line.id, (qtyByProduct.get(line.id) ?? 0) + line.quantity);

        // ── Shift ───────────────────────────────────────────────────────
        const shift = await prisma.shift.findUnique({ where: { id: activeShiftId }, include: { register: true } });
        if (!shift || shift.status !== "OPEN") return fail("El turno no está abierto. Abre un turno para vender.");
        if (shift.userId !== user.id && user.role !== "ADMIN") return fail("Este turno pertenece a otro usuario.");

        const allowNegative = (await prisma.systemConfig.findUnique({ where: { key: "allowNegativeStock" } }))?.value === "true";

        const sale = await prisma.$transaction(async (tx) => {
            const productIds = Array.from(qtyByProduct.keys());
            const dbProducts = await tx.product.findMany({ where: { id: { in: productIds } } });
            if (dbProducts.length !== productIds.length) throw new UserError("Algunos productos ya no existen. Recarga el catálogo.");

            let finalTotal = 0;
            const saleDetails: Prisma.SaleDetailCreateWithoutSaleInput[] = [];

            for (const product of dbProducts) {
                const quantity = qtyByProduct.get(product.id)!;
                if (!product.isActive) throw new UserError(`"${product.name}" está desactivado y no se puede vender.`);

                // Atomic, race-safe decrement: only succeeds if enough stock remains.
                const updated = await tx.product.updateMany({
                    where: allowNegative ? { id: product.id } : { id: product.id, stock: { gte: quantity } },
                    data: { stock: { decrement: quantity } },
                });
                if (updated.count === 0) {
                    throw new UserError(`Stock insuficiente para "${product.name}". Quedan ${product.stock}.`);
                }

                const base = product.price * quantity;
                const taxIvaAmount = round(base * (product.taxIva / 100));
                const taxIcaAmount = round(base * (product.taxIca / 100));
                const taxImpoConsumoAmount = round(base * (product.taxImpoConsumo / 100));
                const lineTotal = round(base) + taxIvaAmount + taxIcaAmount + taxImpoConsumoAmount;
                finalTotal += lineTotal;

                saleDetails.push({
                    product: { connect: { id: product.id } },
                    productName: product.name,
                    productCode: product.code,
                    quantity,
                    unitPrice: product.price,
                    taxIvaAmount,
                    taxIcaAmount,
                    taxImpoConsumoAmount,
                    subtotal: lineTotal,
                });
            }

            const paid = round(payments.reduce((acc, p) => acc + p.amount, 0));
            if (Math.abs(paid - finalTotal) > 1) {
                throw new UserError(
                    `Los pagos ($${paid.toLocaleString("es-CO")}) no coinciden con el total ($${finalTotal.toLocaleString("es-CO")}). ` +
                    `Puede que un precio haya cambiado; vuelve a intentar.`
                );
            }

            // Consecutive number per register, assigned atomically.
            const register = await tx.register.update({
                where: { id: shift.registerId },
                data: { nextNumber: { increment: 1 } },
                select: { nextNumber: true },
            });
            const number = register.nextNumber - 1;

            const newSale = await tx.sale.create({
                data: {
                    shiftId: activeShiftId,
                    customerId: options.customerId,
                    number,
                    total: finalTotal,
                    details: { create: saleDetails },
                    payments: { create: payments.map((p) => ({ method: p.method, amount: round(p.amount) })) },
                },
                include: {
                    details: { include: { product: true } },
                    payments: true,
                    shift: { include: { register: true } },
                },
            });

            const subAccounts: SubAccountInput[] = options.subAccounts
                ?? (options.subAccountLabel ? [{ label: options.subAccountLabel, items, amount: finalTotal }] : []);
            if (subAccounts.length > 0) {
                await tx.subAccount.createMany({
                    data: subAccounts.map((sa) => ({
                        shiftId: activeShiftId,
                        label: sa.label,
                        items: sa.items as unknown as Prisma.InputJsonValue,
                        total: round(sa.amount),
                        paid: true,
                        saleId: newSale.id,
                    })),
                });
            }

            return newSale;
        });

        revalidatePath("/pos");
        revalidatePath("/admin");
        return ok(sale);
    } catch (err) {
        console.error("[processSale]", err);
        return fail(toUserMessage(err, "No se pudo registrar la venta."));
    }
}

/**
 * Cancels (anula) a completed sale: restores stock and marks it CANCELLED.
 * Only admins can cancel. The sale stays in the history for traceability.
 */
export async function cancelSale(saleId: string, reason: string): Promise<ActionResult> {
    try {
        const user = await requireSession("ADMIN");
        const trimmed = (reason ?? "").trim();
        if (trimmed.length < 3) return fail("Escribe el motivo de la anulación.");

        await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { details: true } });
            if (!sale) throw new UserError("La venta no existe.");
            if (sale.status === "CANCELLED") throw new UserError("Esta venta ya fue anulada.");

            for (const d of sale.details) {
                await tx.product.update({ where: { id: d.productId }, data: { stock: { increment: d.quantity } } });
            }
            await tx.payment.updateMany({ where: { saleId }, data: { status: "REFUNDED" } });
            await tx.sale.update({
                where: { id: saleId },
                data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: user.id, cancelReason: trimmed },
            });
        });

        revalidatePath("/admin/sales");
        revalidatePath("/admin");
        revalidatePath("/pos");
        return ok();
    } catch (err) {
        console.error("[cancelSale]", err);
        return fail(toUserMessage(err, "No se pudo anular la venta."));
    }
}
