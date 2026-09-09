import { describe, it, expect } from 'vitest';
import { calculateOrderTotals, breakdownLines, prorateOrderDiscount } from '../../app/lib/tax';

const item = (price: number, quantity = 1, extra: object = {}) =>
    ({ id: String(price), name: 'x', price, quantity, taxIva: 0.19, taxIca: 0, taxImpoConsumo: 0, ...extra });

describe('discounts', () => {
    it('applies a line discount before taxes', () => {
        const t = calculateOrderTotals([item(10000, 1, { discount: 2000 })]);
        expect(t.subtotal).toBe(10000);
        expect(t.discount).toBe(2000);
        expect(t.taxIva).toBe(1520); // 19% of 8000
        expect(t.total).toBe(9520);
    });

    it('prorates a percent order discount across lines and keeps the sum exact', () => {
        const shares = prorateOrderDiscount([3333, 3333, 3334], { type: 'percent', value: 10 });
        expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it('caps a fixed order discount at the discountable base', () => {
        const t = calculateOrderTotals([item(5000)], { type: 'amount', value: 99999 });
        expect(t.discount).toBe(5000);
        expect(t.total).toBe(0);
    });

    it('a line discount can never exceed the line base', () => {
        const [line] = breakdownLines([item(1000, 2, { discount: 5000 })]);
        expect(line.discount).toBe(2000);
        expect(line.total).toBe(0);
    });

    it('combines line and order discounts', () => {
        const t = calculateOrderTotals(
            [item(10000, 1, { discount: 1000 }), item(10000)],
            { type: 'percent', value: 50 }
        );
        // after line discount: 9000 + 10000 = 19000; 50% = 9500
        expect(t.discount).toBe(1000 + 9500);
        expect(t.total).toBe(Math.round(9500 * 1.19));
    });
});
