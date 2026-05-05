"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { SiigoRow } from "@/app/lib/siigo-parser";

export type RowStatus = "new" | "update" | "unchanged";

export interface PreviewRow extends SiigoRow {
    status: RowStatus;
    existingId?: string;
}

export interface ImportResult {
    created: number;
    updated: number;
    unchanged: number;
    errors: string[];
}

/** Returns which rows are new, which would update an existing product, and which are identical. */
export async function previewImport(rows: SiigoRow[]): Promise<PreviewRow[]> {
    const codes = rows.map((r) => r.code);
    const existing = await prisma.product.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true, name: true, price: true, taxIva: true, stock: true, isActive: true },
    });

    const existingMap = new Map(existing.map((p) => [p.code, p]));

    return rows.map((row) => {
        const match = existingMap.get(row.code);
        if (!match) return { ...row, status: "new" };

        const unchanged =
            match.name === row.name &&
            match.price === row.price &&
            match.taxIva === row.taxIva &&
            match.stock === row.stock &&
            match.isActive === row.isActive;

        return {
            ...row,
            status: unchanged ? "unchanged" : "update",
            existingId: match.id,
        };
    });
}

/** Upserts all rows by code. New → create, changed → update, unchanged → skip. */
export async function importProducts(rows: SiigoRow[]): Promise<ImportResult> {
    const preview = await previewImport(rows);
    const result: ImportResult = { created: 0, updated: 0, unchanged: 0, errors: [] };

    for (const row of preview) {
        try {
            if (row.status === "unchanged") {
                result.unchanged++;
                continue;
            }

            const data = {
                name: row.name,
                price: row.price,
                taxIva: row.taxIva,
                stock: row.stock,
                isActive: row.isActive,
                // Reset other taxes to 0 — Siigo export doesn't include ICA / ImpoConsumo
                taxIca: 0,
                taxImpoConsumo: 0,
            };

            await prisma.product.upsert({
                where: { code: row.code },
                create: { ...data, code: row.code, cost: 0 },
                update: data,
            });

            if (row.status === "new") result.created++;
            else result.updated++;
        } catch (err) {
            result.errors.push(`${row.code}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/pos");
    return result;
}
