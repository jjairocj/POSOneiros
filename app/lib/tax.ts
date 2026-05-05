import type { CartItem, OrderTotals } from "@/app/types/cart";

/** Converts a percentage stored in DB (e.g. 19) to a decimal rate (0.19). */
export const toDecimalRate = (pct: number | null | undefined): number =>
    typeof pct === "number" ? pct / 100 : 0;

export const ZERO_TOTALS: OrderTotals = {
    subtotal: 0,
    taxIva: 0,
    taxIca: 0,
    taxImpoConsumo: 0,
    total: 0,
};

export function calculateOrderTotals(items: CartItem[]): OrderTotals {
    let subtotal = 0, taxIva = 0, taxIca = 0, taxImpoConsumo = 0;
    for (const item of items) {
        const base = item.price * item.quantity;
        subtotal       += base;
        taxIva         += base * (item.taxIva ?? 0);
        taxIca         += base * (item.taxIca ?? 0);
        taxImpoConsumo += base * (item.taxImpoConsumo ?? 0);
    }
    return { subtotal, taxIva, taxIca, taxImpoConsumo, total: subtotal + taxIva + taxIca + taxImpoConsumo };
}
