import { prorateOrderDiscount } from "./tax";

/** A minimal cart line the engine needs — deliberately not the full
 * CartItem/SaleLineInput shape so this stays usable from both the client
 * cart preview and the server's authoritative recompute in processSale. */
export interface PromotionCartLine {
    id: string;
    quantity: number;
    price: number;
}

export interface PromotionRuleCondition {
    productId?: string | null;
    familyId?: string | null;
    minQuantity: number;
}

export type PromotionEffectType = "FREE_ITEM" | "FIXED_PRICE" | "PERCENT_OFF" | "AMOUNT_OFF";
export type PromotionTargetType = "CONDITION_ITEMS" | "PRODUCT" | "FAMILY";

export interface PromotionRuleEffect {
    type: PromotionEffectType;
    targetType: PromotionTargetType;
    targetProductId?: string | null;
    targetFamilyId?: string | null;
    /** Percent (0-100) for PERCENT_OFF, COP for FIXED_PRICE/AMOUNT_OFF, unused for FREE_ITEM. */
    value?: number | null;
    /** Unused for CONDITION_ITEMS — the conditions' own minQuantity already says how many. */
    targetQuantity: number;
}

export interface PromotionRule {
    id: string;
    name: string;
    isActive: boolean;
    priority: number;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    conditions: PromotionRuleCondition[];
    effect: PromotionRuleEffect | null;
}

export interface PromotionEvaluation {
    appliedPromotion: { id: string; name: string } | null;
    /** COP to add to each product's existing line discount. Never negative. */
    discountByProduct: Record<string, number>;
}

const NO_DISCOUNT: PromotionEvaluation = { appliedPromotion: null, discountByProduct: {} };

interface Pick {
    productId: string;
    qty: number;
    unitPrice: number;
}

/**
 * Claims `needed` units matching a product or family from a mutable pool
 * (cheapest-priced matching line first — deterministic, and favors the
 * customer when several products in a family have different prices).
 * Mutates `pool` in place so a later call — another condition, or the
 * effect's own target — can't double-claim the same physical units.
 * Returns null if the pool can't cover `needed`.
 */
function claim(pool: PromotionCartLine[], productId: string | null | undefined, familyId: string | null | undefined, needed: number, familyByProductId: Record<string, string | null | undefined>): Pick[] | null {
    if (!productId && !familyId) return null;
    const candidates = pool.filter((it) => it.quantity > 0 && (productId ? it.id === productId : familyByProductId[it.id] === familyId));
    const sorted = [...candidates].sort((a, b) => a.price - b.price);
    let remaining = needed;
    const picks: Pick[] = [];
    for (const line of sorted) {
        if (remaining <= 0) break;
        const qty = Math.min(line.quantity, remaining);
        if (qty <= 0) continue;
        picks.push({ productId: line.id, qty, unitPrice: line.price });
        line.quantity -= qty;
        remaining -= qty;
    }
    return remaining > 1e-9 ? null : picks;
}

function isWithinWindow(rule: PromotionRule, now: Date): boolean {
    if (rule.startDate && now < new Date(rule.startDate)) return false;
    if (rule.endDate && now > new Date(rule.endDate)) return false;
    return true;
}

/** Tries one rule against the cart; returns its discount, or null if it doesn't apply. */
function tryRule(items: PromotionCartLine[], rule: PromotionRule, familyByProductId: Record<string, string | null | undefined>): Record<string, number> | null {
    if (!rule.effect || rule.conditions.length === 0) return null;
    const pool = items.map((it) => ({ ...it }));

    const conditionPicks: Pick[] = [];
    for (const cond of rule.conditions) {
        const picks = claim(pool, cond.productId, cond.familyId, cond.minQuantity, familyByProductId);
        if (!picks) return null;
        conditionPicks.push(...picks);
    }

    const effect = rule.effect;
    const targetPicks = effect.targetType === "CONDITION_ITEMS"
        ? conditionPicks
        : claim(pool, effect.targetType === "PRODUCT" ? effect.targetProductId : null, effect.targetType === "FAMILY" ? effect.targetFamilyId : null, effect.targetQuantity, familyByProductId);
    if (!targetPicks || targetPicks.length === 0) return null;

    const targetBase = targetPicks.reduce((a, p) => a + p.qty * p.unitPrice, 0);
    if (targetBase <= 0) return null;

    let discount = 0;
    switch (effect.type) {
        case "FREE_ITEM": discount = targetBase; break;
        case "FIXED_PRICE": discount = Math.max(0, targetBase - (effect.value ?? 0)); break;
        case "PERCENT_OFF": discount = Math.round(targetBase * Math.min(100, Math.max(0, effect.value ?? 0)) / 100); break;
        case "AMOUNT_OFF": discount = Math.min(targetBase, Math.max(0, effect.value ?? 0)); break;
    }
    if (discount <= 0) return null;

    // Spread the discount across the picked lines proportional to their base,
    // remainder to the last one — same convention prorateOrderDiscount uses.
    const shares = prorateOrderDiscount(targetPicks.map((p) => p.qty * p.unitPrice), { type: "amount", value: discount });
    const discountByProduct: Record<string, number> = {};
    targetPicks.forEach((p, i) => {
        discountByProduct[p.productId] = (discountByProduct[p.productId] ?? 0) + shares[i];
    });
    return discountByProduct;
}

/**
 * Evaluates every active, in-window promotion against the cart and returns
 * the one that applies — promotions don't stack, so this stops at the first
 * (highest-priority, i.e. lowest `priority` number) rule whose conditions
 * are fully met. Pure and side-effect-free: safe to call from the client for
 * a live preview AND from the server as the authoritative recompute.
 */
export function evaluatePromotions(
    items: PromotionCartLine[],
    familyByProductId: Record<string, string | null | undefined>,
    rules: PromotionRule[],
    now: Date = new Date()
): PromotionEvaluation {
    const candidates = rules
        .filter((r) => r.isActive && isWithinWindow(r, now))
        .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

    for (const rule of candidates) {
        const discountByProduct = tryRule(items, rule, familyByProductId);
        if (discountByProduct) {
            return { appliedPromotion: { id: rule.id, name: rule.name }, discountByProduct };
        }
    }
    return NO_DISCOUNT;
}
