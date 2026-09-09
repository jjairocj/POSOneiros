"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { fail, ok, toUserMessage, UserError, type ActionResult } from "@/lib/result";
import { breakdownLines } from "@/app/lib/tax";
import type { OrderDiscount } from "@/app/types/cart";

export interface SaleLineInput {
    id: string;
    quantity: number;
    /** Line discount in COP (whole line). */
    discount?: number;
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
    /** Order-level discount, prorated across lines on the server. */
    discount?: OrderDiscount | null;
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
            if (line.discount !== undefined && (!isMoney(line.discount))) return fail("Descuento de línea inválido.");
        }
        const orderDiscount = options.discount ?? null;
        if (orderDiscount) {
            if (!["percent", "amount"].includes(orderDiscount.type) || !isMoney(orderDiscount.value)) return fail("Descuento inválido.");
            if (orderDiscount.type === "percent" && orderDiscount.value > 100) return fail("El descuento no puede superar el 100%.");
        }
        for (const p of payments) {
            if (!PAYMENT_METHODS.has(p?.method)) return fail("Método de pago inválido.");
            if (!isMoney(p.amount) || p.amount <= 0) return fail("Los importes de pago deben ser mayores a cero.");
        }

        // Merge duplicated lines for the same product
        const qtyByProduct = new Map<string, number>();
        const discByProduct = new Map<string, number>();
        for (const line of items) {
            qtyByProduct.set(line.id, (qtyByProduct.get(line.id) ?? 0) + line.quantity);
            discByProduct.set(line.id, (discByProduct.get(line.id) ?? 0) + (line.discount ?? 0));
        }

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
            let totalDiscount = 0;
            const saleDetails: Prisma.SaleDetailCreateWithoutSaleInput[] = [];

            // Same math as the cart (app/lib/tax.ts), but with DB prices and rates.
            const lines = breakdownLines(
                dbProducts.map((p) => ({
                    price: p.price,
                    quantity: qtyByProduct.get(p.id)!,
                    discount: discByProduct.get(p.id) ?? 0,
                    taxIva: p.taxIva / 100, taxIca: p.taxIca / 100, taxImpoConsumo: p.taxImpoConsumo / 100,
                })),
                orderDiscount
            );

            for (const [idx, product] of dbProducts.entries()) {
                const quantity = qtyByProduct.get(product.id)!;
                const line = lines[idx];
                if (!product.isActive) throw new UserError(`"${product.name}" está desactivado y no se puede vender.`);

                // Atomic, race-safe decrement: only succeeds if enough stock remains.
                const updated = await tx.product.updateMany({
                    where: allowNegative ? { id: product.id } : { id: product.id, stock: { gte: quantity } },
                    data: { stock: { decrement: quantity } },
                });
                if (updated.count === 0) {
                    throw new UserError(`Stock insuficiente para "${product.name}". Quedan ${product.stock}.`);
                }

                finalTotal += line.total;
                totalDiscount += line.discount;

                saleDetails.push({
                    product: { connect: { id: product.id } },
                    productName: product.name,
                    productCode: product.code,
                    quantity,
                    unitPrice: product.price,
                    discount: line.discount,
                    taxIvaAmount: line.taxIva,
                    taxIcaAmount: line.taxIca,
                    taxImpoConsumoAmount: line.taxImpoConsumo,
                    subtotal: line.total,
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
                    discount: totalDiscount,
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
