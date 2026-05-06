import { describe, it, expect } from 'vitest';
import { formatMoney } from '../../app/lib/money';

// formatMoney uses es-CO locale: thousands separator = ".", decimal = ","
describe('formatMoney', () => {
    it('formats a whole number', () => {
        expect(formatMoney(1500)).toBe('$1.500');
    });

    it('formats zero', () => {
        expect(formatMoney(0)).toBe('$0');
    });

    it('formats a large number with thousands separators', () => {
        expect(formatMoney(1000000)).toBe('$1.000.000');
    });

    it('rounds decimals to nearest integer', () => {
        expect(formatMoney(1500.7)).toBe('$1.501');
        expect(formatMoney(1500.2)).toBe('$1.500');
    });

    it('prepends $ sign', () => {
        expect(formatMoney(500)).toMatch(/^\$/);
    });

    it('handles negative values', () => {
        // es-CO negative: "$-500"
        expect(formatMoney(-500)).toContain('500');
    });
});
