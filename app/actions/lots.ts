"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { fail, ok, toUserMessage, UserError, type ActionResult } from "@/lib/result";

const isPositiveNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

// ─── Product lots (health-authority traceability for LOT-tracked products) ──

export interface ReceiveProductLotInput {
    productId: string;
    lotNumber?: string;
    expirationDate?: string | null; // "YYYY-MM-DD", optional
    quantity: number;
    supplierId?: string | null;
}

/**
 * Registers a new delivery of a lot-tracked product (e.g. a case of Buldak):
 * creates the ProductLot and bumps Product.stock, same as a manual PURCHASE
 * movement but attributed to this specific lot for traceability.
 */
export async function receiveProductLot(input: ReceiveProductLotInput): Promise<ActionResult> {
    try {
        const manager = await requirePermission("RECEIVE_INVENTORY");
        if (!isPositiveNumber(input.quantity)) return fail("La cantidad debe ser mayor a cero.");

        await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id: input.productId } });
            if (!product) throw new UserError("El producto no existe.");
            if (product.trackingMode !== "LOT") {
                throw new UserError("Este producto no está configurado para seguimiento por lote.");
            }

            const lot = await tx.productLot.create({
                data: {
                    productId: input.productId,
                    lotNumber: input.lotNumber?.trim() || null,
                    expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
                    quantityReceived: input.quantity,
                    quantityRemaining: input.quantity,
                    supplierId: input.supplierId || null,
                },
            });
            const updated = await tx.product.update({
                where: { id: input.productId },
                data: { stock: { increment: input.quantity } },
            });
            await tx.stockMovement.create({
                data: {
                    productId: input.productId, type: "PURCHASE", quantity: input.quantity,
                    stockAfter: updated.stock, userId: manager.id, lotId: lot.id,
                    reason: lot.lotNumber ? `Lote ${lot.lotNumber}` : "Lote sin número",
                },
            });
        });

        revalidatePath("/admin/inventory");
        revalidatePath("/admin");
        revalidatePath("/pos");
        return ok();
    } catch (error) {
        console.error("[receiveProductLot]", error);
        return fail(toUserMessage(error, "No se pudo registrar el lote."));
    }
}

export interface ProductLotRow {
    id: string;
    productId: string;
    productName: string;
    lotNumber: string | null;
    expirationDate: string | null;
    receivedDate: string;
    quantityReceived: number;
    quantityRemaining: number;
    supplierName: string | null;
}

/** Lots for one product, most recently received first. */
export async function getProductLots(productId: string): Promise<ProductLotRow[]> {
    try {
        await requirePermission("RECEIVE_INVENTORY");
        const lots = await prisma.productLot.findMany({
            where: { productId },
            include: { product: { select: { name: true } }, supplier: { select: { name: true } } },
            orderBy: { receivedDate: "desc" },
        });
        return lots.map((l) => ({
            id: l.id, productId: l.productId, productName: l.product.name,
            lotNumber: l.lotNumber, expirationDate: l.expirationDate?.toISOString() ?? null,
            receivedDate: l.receivedDate.toISOString(), quantityReceived: l.quantityReceived,
            quantityRemaining: l.quantityRemaining, supplierName: l.supplier?.name ?? null,
        }));
    } catch (error) {
        console.error("[getProductLots]", error);
        return [];
    }
}

// ─── Raw materials (bulk-ingredient log for NONE-tracked products) ──────────

export interface RawMaterialRow {
    id: string;
    name: string;
    activeLot: {
        id: string;
        lotNumber: string | null;
        expirationDate: string | null;
        receivedDate: string;
        supplierName: string | null;
    } | null;
}

/** Every raw material with its currently active lot, if any. */
export async function getRawMaterials(): Promise<RawMaterialRow[]> {
    try {
        await requirePermission("RECEIVE_INVENTORY");
        const materials = await prisma.rawMaterial.findMany({
            include: {
                lots: {
                    where: { status: "ACTIVE" }, orderBy: { receivedDate: "desc" }, take: 1,
                    include: { supplier: { select: { name: true } } },
                },
            },
            orderBy: { name: "asc" },
        });
        return materials.map((m) => ({
            id: m.id, name: m.name,
            activeLot: m.lots[0]
                ? {
                    id: m.lots[0].id, lotNumber: m.lots[0].lotNumber,
                    expirationDate: m.lots[0].expirationDate?.toISOString() ?? null,
                    receivedDate: m.lots[0].receivedDate.toISOString(),
                    supplierName: m.lots[0].supplier?.name ?? null,
                }
                : null,
        }));
    } catch (error) {
        console.error("[getRawMaterials]", error);
        return [];
    }
}

/** Creates a new raw material (e.g. "Café en grano") with no lot yet. */
export async function createRawMaterial(name: string): Promise<ActionResult> {
    try {
        await requirePermission("RECEIVE_INVENTORY");
        const trimmed = name.trim();
        if (!trimmed) return fail("El nombre es obligatorio.");
        await prisma.rawMaterial.create({ data: { name: trimmed } });
        revalidatePath("/admin/inventory");
        return ok();
    } catch (error) {
        console.error("[createRawMaterial]", error);
        return fail(toUserMessage(error, "No se pudo crear el insumo."));
    }
}

export interface ReceiveRawMaterialLotInput {
    rawMaterialId: string;
    lotNumber?: string;
    expirationDate?: string | null;
    notes?: string;
    supplierId?: string | null;
}

/**
 * Registers "I opened a new bag/tub of this raw material": auto-marks the
 * previous active lot DEPLETED (a business only has one open at a time) and
 * creates the new one as ACTIVE. No quantity tracking — see docs/16, this is
 * a compliance log, not a stock count.
 */
export async function receiveRawMaterialLot(input: ReceiveRawMaterialLotInput): Promise<ActionResult> {
    try {
        const manager = await requirePermission("RECEIVE_INVENTORY");
        await prisma.$transaction(async (tx) => {
            await tx.rawMaterialLot.updateMany({
                where: { rawMaterialId: input.rawMaterialId, status: "ACTIVE" },
                data: { status: "DEPLETED" },
            });
            await tx.rawMaterialLot.create({
                data: {
                    rawMaterialId: input.rawMaterialId,
                    lotNumber: input.lotNumber?.trim() || null,
                    expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
                    notes: input.notes?.trim() || null,
                    createdById: manager.id,
                    supplierId: input.supplierId || null,
                },
            });
        });
        revalidatePath("/admin/inventory");
        return ok();
    } catch (error) {
        console.error("[receiveRawMaterialLot]", error);
        return fail(toUserMessage(error, "No se pudo registrar el insumo."));
    }
}

/** Manual override: mark a raw material lot depleted without registering a replacement yet. */
export async function markRawMaterialLotDepleted(lotId: string): Promise<ActionResult> {
    try {
        await requirePermission("RECEIVE_INVENTORY");
        await prisma.rawMaterialLot.update({ where: { id: lotId }, data: { status: "DEPLETED" } });
        revalidatePath("/admin/inventory");
        return ok();
    } catch (error) {
        console.error("[markRawMaterialLotDepleted]", error);
        return fail(toUserMessage(error));
    }
}

// ─── "What sold while this insumo lasted" report ────────────────────────────

export interface RawMaterialConsumptionLot {
    lotId: string;
    lotNumber: string | null;
    status: "ACTIVE" | "DEPLETED";
    startDate: string;
    /** null while the lot is still the active one — the window is open-ended. */
    endDate: string | null;
    saleCount: number;
    totalQuantitySold: number;
    totalRevenue: number;
    byProduct: { productId: string; productName: string; quantitySold: number; revenue: number }[];
}

/**
 * For a given insumo (e.g. "Café en grano"), breaks down what sold — by
 * product, per lot — while each lot was the one in use. A lot's window runs
 * from its `receivedDate` to the next lot's `receivedDate` (lots replace each
 * other one at a time, see receiveRawMaterialLot), or to `updatedAt` if it
 * was manually marked DEPLETED with no replacement yet, or stays open-ended
 * if it's still ACTIVE.
 */
export async function getRawMaterialConsumptionReport(rawMaterialId: string): Promise<ActionResult<RawMaterialConsumptionLot[]>> {
    try {
        await requirePermission("VIEW_REPORTS");

        const [lots, products] = await Promise.all([
            prisma.rawMaterialLot.findMany({ where: { rawMaterialId }, orderBy: { receivedDate: "asc" } }),
            prisma.product.findMany({ where: { rawMaterialId }, select: { id: true, name: true } }),
        ]);
        if (products.length === 0 || lots.length === 0) return ok([]);

        const productIds = products.map((p) => p.id);
        const nameById = new Map(products.map((p) => [p.id, p.name]));

        const results: RawMaterialConsumptionLot[] = [];
        for (let i = 0; i < lots.length; i++) {
            const lot = lots[i];
            const next = lots[i + 1];
            const start = lot.receivedDate;
            const end = next ? next.receivedDate : lot.status === "DEPLETED" ? lot.updatedAt : null;

            const details = await prisma.saleDetail.findMany({
                where: {
                    productId: { in: productIds },
                    sale: { status: "COMPLETED", createdAt: end ? { gte: start, lt: end } : { gte: start } },
                },
                select: { productId: true, quantity: true, subtotal: true, saleId: true },
            });

            const byProduct = new Map<string, { quantitySold: number; revenue: number }>();
            const saleIds = new Set<string>();
            for (const d of details) {
                saleIds.add(d.saleId);
                const entry = byProduct.get(d.productId) ?? { quantitySold: 0, revenue: 0 };
                entry.quantitySold += d.quantity;
                entry.revenue += d.subtotal;
                byProduct.set(d.productId, entry);
            }

            results.push({
                lotId: lot.id,
                lotNumber: lot.lotNumber,
                status: lot.status as "ACTIVE" | "DEPLETED",
                startDate: start.toISOString(),
                endDate: end ? end.toISOString() : null,
                saleCount: saleIds.size,
                totalQuantitySold: Array.from(byProduct.values()).reduce((a, v) => a + v.quantitySold, 0),
                totalRevenue: Array.from(byProduct.values()).reduce((a, v) => a + v.revenue, 0),
                byProduct: Array.from(byProduct.entries())
                    .map(([productId, v]) => ({ productId, productName: nameById.get(productId) ?? "?", ...v }))
                    .sort((a, b) => b.quantitySold - a.quantitySold),
            });
        }
        return ok(results.reverse()); // most recent lot first
    } catch (error) {
        console.error("[getRawMaterialConsumptionReport]", error);
        return fail(toUserMessage(error, "No se pudo generar el reporte de consumo."));
    }
}

// ─── Expiration dashboard widget ────────────────────────────────────────────

export interface ExpiringItem {
    kind: "product" | "raw-material";
    id: string;
    name: string;
    lotNumber: string | null;
    expirationDate: string;
    quantityRemaining?: number;
}

/** Product lots and active raw-material lots expiring within `daysAhead`. */
export async function getExpiringItems(daysAhead = 7): Promise<ExpiringItem[]> {
    try {
        await requirePermission("VIEW_DASHBOARD");
        const horizon = new Date();
        horizon.setDate(horizon.getDate() + daysAhead);

        const [productLots, rawLots] = await Promise.all([
            prisma.productLot.findMany({
                where: { expirationDate: { lte: horizon }, quantityRemaining: { gt: 0 } },
                include: { product: { select: { name: true } } },
                orderBy: { expirationDate: "asc" },
            }),
            prisma.rawMaterialLot.findMany({
                where: { expirationDate: { lte: horizon }, status: "ACTIVE" },
                include: { rawMaterial: { select: { name: true } } },
                orderBy: { expirationDate: "asc" },
            }),
        ]);

        const items: ExpiringItem[] = [
            ...productLots.map((l) => ({
                kind: "product" as const, id: l.id, name: l.product.name, lotNumber: l.lotNumber,
                expirationDate: l.expirationDate!.toISOString(), quantityRemaining: l.quantityRemaining,
            })),
            ...rawLots.map((l) => ({
                kind: "raw-material" as const, id: l.id, name: l.rawMaterial.name, lotNumber: l.lotNumber,
                expirationDate: l.expirationDate!.toISOString(),
            })),
        ];
        return items.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
    } catch (error) {
        console.error("[getExpiringItems]", error);
        return [];
    }
}
