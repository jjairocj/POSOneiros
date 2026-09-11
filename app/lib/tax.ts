import type { CartItem, OrderDiscount, OrderTotals } from "@/app/types/cart";

/** Converts a percentage stored in DB (e.g. 19) to a decimal rate (0.19). */
export const toDecimalRate = (pct: number | null | undefined): number =>
    typeof pct === "number" ? pct / 100 : 0;

export const ZERO_TOTALS: OrderTotals = {
    subtotal: 0,
    discount: 0,
    taxIva: 0,
    taxIca: 0,
    taxImpoConsumo: 0,
    total: 0,
};

export interface LineBreakdown {
    base: number;          // price * qty, rounded
    discount: number;      // line discount + prorated share of the order discount
    taxable: number;       // base - discount
    taxIva: number;
    taxIca: number;
    taxImpoConsumo: number;
    total: number;         // taxable + taxes
}

/**
 * Turns an order-level discount into per-line COP amounts, proportional to
 * each line's base after its own discount. The rounding remainder goes to the
 * last line so the sum is exact. Never exceeds what the lines can absorb.
 */
export function prorateOrderDiscount(lineTaxables: number[], orderDiscount?: OrderDiscount | null): number[] {
    const n = lineTaxables.length;
    if (!orderDiscount || n === 0) return lineTaxables.map(() => 0);
    const pool = lineTaxables.reduce((a, b) => a + b, 0);
    if (pool <= 0) return lineTaxables.map(() => 0);

    const wanted = orderDiscount.type === "percent"
        ? Math.round(pool * Math.min(100, Math.max(0, orderDiscount.value)) / 100)
        : Math.min(pool, Math.max(0, Math.round(orderDiscount.value)));

    const shares = lineTaxables.map((t) => Math.round(wanted * t / pool));
    const diff = wanted - shares.reduce((a, b) => a + b, 0);
    for (let i = n - 1; i >= 0 && diff !== 0; i--) {
        // Adjust the last line that can absorb it
        if (lineTaxables[i] - shares[i] >= diff) { shares[i] += diff; break; }
    }
    return shares.map((s, i) => Math.min(s, lineTaxables[i]));
}

/**
 * Line-by-line breakdown, rounded to whole pesos, identical on client and
 * server. Taxes are computed on the discounted base (Colombian practice).
 * `rates` are decimal (0.19), as stored in CartItem.
 */
export function breakdownLines(
    lines: { price: number; quantity: number; discount?: number; taxIva: number; taxIca: number; taxImpoConsumo: number }[],
    orderDiscount?: OrderDiscount | null
): LineBreakdown[] {
    const bases = lines.map((l) => Math.round(l.price * l.quantity));
    const lineDisc = lines.map((l, i) => Math.min(bases[i], Math.max(0, Math.round(l.discount ?? 0))));
    const afterLine = bases.map((b, i) => b - lineDisc[i]);
    const orderShares = prorateOrderDiscount(afterLine, orderDiscount);

    return lines.map((l, i) => {
        const discount = lineDisc[i] + orderShares[i];
        const taxable = bases[i] - discount;
        const taxIva = Math.round(taxable * (l.taxIva ?? 0));
        const taxIca = Math.round(taxable * (l.taxIca ?? 0));
        const taxImpoConsumo = Math.round(taxable * (l.taxImpoConsumo ?? 0));
        return { base: bases[i], discount, taxable, taxIva, taxIca, taxImpoConsumo, total: taxable + taxIva + taxIca + taxImpoConsumo };
    });
}

export function calculateOrderTotals(items: CartItem[], orderDiscount?: OrderDiscount | null): OrderTotals {
    const lines = breakdownLines(items, orderDiscount);
    const sum = (k: keyof LineBreakdown) => lines.reduce((a, l) => a + l[k], 0);
    return {
        subtotal: sum("base"),
        discount: sum("discount"),
        taxIva: sum("taxIva"),
        taxIca: sum("taxIca"),
        taxImpoConsumo: sum("taxImpoConsumo"),
        total: sum("total"),
    };
}

/** One subaccount's assigned quantity per item, for splitOrderByItems. */
export interface SubAccountAllocation {
    id: string;
    items: { id: string; quantity: number }[];
}

const LINE_FIELD_FOR: Record<keyof OrderTotals, keyof LineBreakdown> = {
    subtotal: "base", discount: "discount", taxIva: "taxIva", taxIca: "taxIca", taxImpoConsumo: "taxImpoConsumo", total: "total",
};

/**
 * Splits an order's real totals (line discounts AND the order-level discount,
 * both already baked into `breakdownLines`) across several subaccounts by
 * item assignment — exactly: the grand sum across all subaccounts always
 * equals calculateOrderTotals(orderItems, orderDiscount), even when a single
 * item's quantity is split across people. calculateOrderTotals(sa.items)
 * alone can't do this: computed on a subaccount's items in isolation, it has
 * no way to know its fair share of a discount applied to the *whole* order.
 *
 * Per item, each unit gets an equal integer-peso share (floor); any leftover
 * pesos (always < that item's quantity, since it's a remainder of a
 * floor-division) go to whichever subaccount holds the last assigned unit —
 * the same "remainder to the last share" rule prorateOrderDiscount already
 * uses for lines, applied here to a line's units instead.
 */
export function splitOrderByItems(
    orderItems: CartItem[],
    orderDiscount: OrderDiscount | null | undefined,
    allocations: SubAccountAllocation[]
): Record<string, OrderTotals> {
    const orderLines = breakdownLines(orderItems, orderDiscount);
    const result: Record<string, OrderTotals> = {};
    for (const a of allocations) result[a.id] = { ...ZERO_TOTALS };

    orderItems.forEach((item, idx) => {
        const line = orderLines[idx];
        const qty = item.quantity;
        if (qty <= 0) return;

        const touching = allocations
            .map((a) => ({ id: a.id, q: a.items.find((i) => i.id === item.id)?.quantity ?? 0 }))
            .filter((t) => t.q > 0);
        if (touching.length === 0) return;

        (Object.keys(LINE_FIELD_FOR) as (keyof OrderTotals)[]).forEach((field) => {
            const lineVal = line[LINE_FIELD_FOR[field]];
            const perUnit = Math.floor(lineVal / qty);
            const remainder = lineVal - perUnit * qty;
            touching.forEach((t, ti) => {
                const share = perUnit * t.q + (ti === touching.length - 1 ? remainder : 0);
                result[t.id][field] += share;
            });
        });
    });

    return result;
}
