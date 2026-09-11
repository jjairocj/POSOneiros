import { describe, it, expect } from 'vitest';
import { numberToWords, moneyInWords } from '../../app/lib/numberToWords';

describe('numberToWords', () => {
    it('handles zero', () => {
        expect(numberToWords(0)).toBe('cero');
    });

    it('handles units, teens and tens', () => {
        expect(numberToWords(1)).toBe('uno');
        expect(numberToWords(9)).toBe('nueve');
        expect(numberToWords(10)).toBe('diez');
        expect(numberToWords(16)).toBe('dieciséis');
        expect(numberToWords(20)).toBe('veinte');
        expect(numberToWords(21)).toBe('veintiuno');
        expect(numberToWords(30)).toBe('treinta');
        expect(numberToWords(37)).toBe('treinta y siete');
        expect(numberToWords(99)).toBe('noventa y nueve');
    });

    it('handles hundreds, including the "cien" exception', () => {
        expect(numberToWords(100)).toBe('cien');
        expect(numberToWords(101)).toBe('ciento uno');
        expect(numberToWords(500)).toBe('quinientos');
        expect(numberToWords(999)).toBe('novecientos noventa y nueve');
    });

    it('handles thousands', () => {
        expect(numberToWords(1000)).toBe('mil');
        expect(numberToWords(2000)).toBe('dos mil');
        expect(numberToWords(37500)).toBe('treinta y siete mil quinientos');
        expect(numberToWords(100000)).toBe('cien mil');
    });

    it('handles millions', () => {
        expect(numberToWords(1000000)).toBe('un millón');
        expect(numberToWords(2000000)).toBe('dos millones');
        expect(numberToWords(1500000)).toBe('un millón quinientos mil');
    });

    it('rounds decimals and ignores sign', () => {
        expect(numberToWords(37.6)).toBe('treinta y ocho');
        expect(numberToWords(-50)).toBe('cincuenta');
    });
});

describe('moneyInWords', () => {
    it('uppercases and appends the currency suffix', () => {
        expect(moneyInWords(37500)).toBe('TREINTA Y SIETE MIL QUINIENTOS PESOS M/CTE');
    });
});
