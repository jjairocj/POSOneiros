import { describe, it, expect } from 'vitest';
import { evaluatePromotions, type PromotionRule, type PromotionCartLine } from '../../app/lib/promotions';

const FAMILIES: Record<string, string | null> = {
    'buldak-carbonara': 'fam-buldak',
    'buldak-original': 'fam-buldak',
    'shin-ramen': 'fam-shin',
    'agua': null,
    'gaseosa': 'fam-bebidas',
    'jugo': 'fam-bebidas',
};

function rule(overrides: Partial<PromotionRule> = {}): PromotionRule {
    return {
        id: 'promo-1', name: 'Promo', isActive: true, priority: 0,
        startDate: null, endDate: null, conditions: [], effect: null,
        ...overrides,
    };
}

const line = (id: string, quantity: number, price: number): PromotionCartLine => ({ id, quantity, price });

describe('evaluatePromotions — no applicable promotion', () => {
    it('returns no discount when the cart is empty', () => {
        const result = evaluatePromotions([], FAMILIES, [rule({
            conditions: [{ productId: 'agua', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        })]);
        expect(result).toEqual({ appliedPromotion: null, discountByProduct: {} });
    });

    it('does not apply an inactive promotion', () => {
        const items = [line('agua', 2, 2000)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            isActive: false,
            conditions: [{ productId: 'agua', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        })]);
        expect(result.appliedPromotion).toBeNull();
    });

    it('does not apply a promotion outside its date window', () => {
        const items = [line('agua', 2, 2000)];
        const future = rule({
            startDate: '2099-01-01', conditions: [{ productId: 'agua', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        });
        const expired = rule({
            id: 'promo-2', endDate: '2020-01-01', conditions: [{ productId: 'agua', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        });
        expect(evaluatePromotions(items, FAMILIES, [future], new Date('2026-06-01')).appliedPromotion).toBeNull();
        expect(evaluatePromotions(items, FAMILIES, [expired], new Date('2026-06-01')).appliedPromotion).toBeNull();
    });

    it('is active within its date window', () => {
        const items = [line('agua', 2, 2000)];
        const active = rule({
            startDate: '2026-01-01', endDate: '2026-12-31',
            conditions: [{ productId: 'agua', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        });
        expect(evaluatePromotions(items, FAMILIES, [active], new Date('2026-06-01')).appliedPromotion).not.toBeNull();
    });

    it('does not apply when the condition quantity is not met', () => {
        const items = [line('buldak-carbonara', 1, 6000)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ productId: 'buldak-carbonara', minQuantity: 2 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        })]);
        expect(result.appliedPromotion).toBeNull();
    });

    it('does not apply when the target is not present in the cart at all (buy X get Y free, but no Y in cart)', () => {
        const items = [line('buldak-carbonara', 1, 6000)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ productId: 'buldak-carbonara', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'shin-ramen', targetQuantity: 1 },
        })]);
        expect(result.appliedPromotion).toBeNull();
    });
});

describe('evaluatePromotions — FREE_ITEM (X+Y get Z free)', () => {
    it('makes the target item free and discounts exactly its price', () => {
        const items = [line('buldak-carbonara', 1, 6000), line('shin-ramen', 1, 5500), line('agua', 1, 2000)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ productId: 'buldak-carbonara', minQuantity: 1 }, { productId: 'shin-ramen', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        })]);
        expect(result.appliedPromotion).toEqual({ id: 'promo-1', name: 'Promo' });
        expect(result.discountByProduct).toEqual({ agua: 2000 });
    });
});

describe('evaluatePromotions — FIXED_PRICE on CONDITION_ITEMS (combo price)', () => {
    it('discounts the combo down to the fixed total, split across the combo items', () => {
        // Buldak (6000) + Shin (5500) = 11500 -> fixed at 10000, discount 1500
        const items = [line('buldak-carbonara', 1, 6000), line('shin-ramen', 1, 5500)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ productId: 'buldak-carbonara', minQuantity: 1 }, { productId: 'shin-ramen', minQuantity: 1 }],
            effect: { type: 'FIXED_PRICE', targetType: 'CONDITION_ITEMS', value: 10000, targetQuantity: 1 },
        })]);
        const total = Object.values(result.discountByProduct).reduce((a, b) => a + b, 0);
        expect(total).toBe(1500);
        expect(result.discountByProduct['buldak-carbonara']).toBeGreaterThan(0);
        expect(result.discountByProduct['shin-ramen']).toBeGreaterThan(0);
    });

    it('only discounts the required combo quantity, not extra units of the same product', () => {
        // 2 Buldak + 1 Shin in cart, but the combo only needs 1+1 — the second
        // Buldak stays full price.
        const items = [line('buldak-carbonara', 2, 6000), line('shin-ramen', 1, 5500)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ productId: 'buldak-carbonara', minQuantity: 1 }, { productId: 'shin-ramen', minQuantity: 1 }],
            effect: { type: 'FIXED_PRICE', targetType: 'CONDITION_ITEMS', value: 10000, targetQuantity: 1 },
        })]);
        const total = Object.values(result.discountByProduct).reduce((a, b) => a + b, 0);
        expect(total).toBe(1500); // combo of 1+1 only, not 2+1
    });
});

describe('evaluatePromotions — PERCENT_OFF on a companion PRODUCT', () => {
    it('applies X% off only to the companion product', () => {
        const items = [line('buldak-carbonara', 1, 6000), line('shin-ramen', 1, 5500)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ productId: 'buldak-carbonara', minQuantity: 1 }],
            effect: { type: 'PERCENT_OFF', targetType: 'PRODUCT', targetProductId: 'shin-ramen', value: 20, targetQuantity: 1 },
        })]);
        expect(result.discountByProduct).toEqual({ 'shin-ramen': Math.round(5500 * 0.2) });
        expect(result.discountByProduct['buldak-carbonara']).toBeUndefined();
    });
});

describe('evaluatePromotions — FAMILY condition and FAMILY target ("any Buldak flavor" -> drink at fixed price)', () => {
    it('matches any flavor in the family for the condition', () => {
        const items = [line('buldak-original', 1, 6000), line('gaseosa', 1, 3000)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ familyId: 'fam-buldak', minQuantity: 1 }],
            effect: { type: 'FIXED_PRICE', targetType: 'FAMILY', targetFamilyId: 'fam-bebidas', value: 2000, targetQuantity: 1 },
        })]);
        expect(result.discountByProduct).toEqual({ gaseosa: 1000 }); // 3000 -> 2000
    });

    it('picks the cheapest matching item in the family target when several qualify', () => {
        const items = [line('buldak-original', 1, 6000), line('gaseosa', 1, 3000), line('jugo', 1, 2500)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ familyId: 'fam-buldak', minQuantity: 1 }],
            effect: { type: 'FIXED_PRICE', targetType: 'FAMILY', targetFamilyId: 'fam-bebidas', value: 2000, targetQuantity: 1 },
        })]);
        // jugo (2500) is cheaper than gaseosa (3000) -> jugo gets the deal
        expect(result.discountByProduct).toEqual({ jugo: 500 });
    });
});

describe('evaluatePromotions — priority and no-stacking', () => {
    const items = [line('buldak-carbonara', 1, 6000), line('shin-ramen', 1, 5500), line('agua', 1, 2000)];
    const highPriority = rule({
        id: 'promo-high', priority: 0, name: 'Combo fijo',
        conditions: [{ productId: 'buldak-carbonara', minQuantity: 1 }, { productId: 'shin-ramen', minQuantity: 1 }],
        effect: { type: 'FIXED_PRICE', targetType: 'CONDITION_ITEMS', value: 10000, targetQuantity: 1 },
    });
    const lowPriority = rule({
        id: 'promo-low', priority: 5, name: 'Agua gratis',
        conditions: [{ productId: 'buldak-carbonara', minQuantity: 1 }],
        effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
    });

    it('applies only the highest-priority (lowest number) promotion when both match', () => {
        const result = evaluatePromotions(items, FAMILIES, [lowPriority, highPriority]);
        expect(result.appliedPromotion?.id).toBe('promo-high');
        expect(result.discountByProduct.agua).toBeUndefined();
    });

    it('order in the input array does not matter, only priority', () => {
        const result = evaluatePromotions(items, FAMILIES, [highPriority, lowPriority]);
        expect(result.appliedPromotion?.id).toBe('promo-high');
    });

    it('falls through to the next-priority promotion when the top one does not match', () => {
        const cartWithoutShin = [line('buldak-carbonara', 1, 6000), line('agua', 1, 2000)];
        const result = evaluatePromotions(cartWithoutShin, FAMILIES, [highPriority, lowPriority]);
        expect(result.appliedPromotion?.id).toBe('promo-low');
        expect(result.discountByProduct).toEqual({ agua: 2000 });
    });
});

describe('evaluatePromotions — rounding', () => {
    it('the combo discount split across lines always sums exactly, no pesos lost to rounding', () => {
        // 3 items whose combined base (11000) minus fixed price (7000) = 4000,
        // split across bases that don't divide evenly.
        const items = [line('a', 1, 3333), line('b', 1, 3333), line('c', 1, 4334)];
        const result = evaluatePromotions(items, {}, [rule({
            conditions: [{ productId: 'a', minQuantity: 1 }, { productId: 'b', minQuantity: 1 }, { productId: 'c', minQuantity: 1 }],
            effect: { type: 'FIXED_PRICE', targetType: 'CONDITION_ITEMS', value: 7000, targetQuantity: 1 },
        })]);
        const total = Object.values(result.discountByProduct).reduce((a, b) => a + b, 0);
        expect(total).toBe(4000);
    });
});

describe('evaluatePromotions — AMOUNT_OFF caps at the target base, never goes negative', () => {
    it('caps the discount at the target line price when value exceeds it', () => {
        const items = [line('buldak-carbonara', 1, 6000), line('agua', 1, 2000)];
        const result = evaluatePromotions(items, FAMILIES, [rule({
            conditions: [{ productId: 'buldak-carbonara', minQuantity: 1 }],
            effect: { type: 'AMOUNT_OFF', targetType: 'PRODUCT', targetProductId: 'agua', value: 5000, targetQuantity: 1 },
        })]);
        expect(result.discountByProduct.agua).toBe(2000); // capped, not 5000
    });

    it('a condition and target referencing the same product need enough combined units (no double-claiming the same unit)', () => {
        // Only 1 water in the cart: it can't simultaneously be "the condition"
        // and "the free item" — the shared claim pool correctly refuses this.
        const oneUnit = [line('agua', 1, 2000)];
        const notEnough = evaluatePromotions(oneUnit, FAMILIES, [rule({
            conditions: [{ productId: 'agua', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        })]);
        expect(notEnough.appliedPromotion).toBeNull();

        // 2 units covers both the condition (1) and the free target (1).
        const twoUnits = [line('agua', 2, 2000)];
        const enough = evaluatePromotions(twoUnits, FAMILIES, [rule({
            conditions: [{ productId: 'agua', minQuantity: 1 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'agua', targetQuantity: 1 },
        })]);
        expect(enough.discountByProduct).toEqual({ agua: 2000 });
    });
});
