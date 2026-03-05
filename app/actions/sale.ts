"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function processSale(
    activeShiftId: string,
    items: any[],
    payments: { method: string, amount: number }[],
    customerId?: string
) {
    // Validate shift
    const shift = await prisma.shift.findUnique({ where: { id: activeShiftId } });
    if (!shift || shift.status !== "OPEN") throw new Error("Turno inválido o cerrado");

    const productIds = items.map((i: any) => i.id);
    const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (dbProducts.length !== items.length) throw new Error("Algunos productos ya no existen");

    // Transactional sale creation
    const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        let finalTotal = 0;
        const saleDetails = [];

        for (const item of items) {
            const dbProduct = dbProducts.find((p: any) => p.id === item.id);
            if (!dbProduct) throw new Error("Producto no encontrado");

            if (dbProduct.stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${dbProduct.name}. Quedan ${dbProduct.stock}.`);
            }

            await tx.product.update({
                where: { id: dbProduct.id },
                data: { stock: { decrement: item.quantity } }
            });

            // Taxes calculations
            const taxIvaAmount = dbProduct.taxIva ? dbProduct.price * (dbProduct.taxIva / 100) : 0;
            const taxIcaAmount = dbProduct.taxIca ? dbProduct.price * (dbProduct.taxIca / 100) : 0;
            const taxImpoConsumoAmount = dbProduct.taxImpoConsumo ? dbProduct.price * (dbProduct.taxImpoConsumo / 100) : 0;

            const totalTaxes = taxIvaAmount + taxIcaAmount + taxImpoConsumoAmount;

            // Subtotal per line
            const lineTotal = (dbProduct.price * item.quantity) + (totalTaxes * item.quantity);
            finalTotal += lineTotal;

            saleDetails.push({
                productId: dbProduct.id,
                quantity: item.quantity,
                unitPrice: dbProduct.price, // Base unit price
                taxIvaAmount: taxIvaAmount * item.quantity,
                taxIcaAmount: taxIcaAmount * item.quantity,
                taxImpoConsumoAmount: taxImpoConsumoAmount * item.quantity,
                subtotal: lineTotal
            });
        }

        const newSale = await tx.sale.create({
            data: {
                shiftId: activeShiftId,
                customerId,
                total: finalTotal,
                details: {
                    create: saleDetails
                },
                payments: {
                    create: payments.map((p: any) => ({
                        method: p.method,
                        amount: p.amount
                    }))
                }
            }
        });

        return newSale;
    });

    revalidatePath("/pos");
    return sale;
}
