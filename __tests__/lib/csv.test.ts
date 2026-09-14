import { describe, it, expect } from 'vitest';
import { toCsv } from '../../app/lib/csv';
import { startOfBusinessDay, endOfBusinessDay, businessHour, businessDayKey } from '../../app/lib/time';

describe('toCsv', () => {
    it('uses ; separator, CRLF and a UTF-8 BOM so Excel (es) opens it directly', () => {
        const csv = toCsv(['A', 'B'], [[1, 'x'], ['y;z', 'con "comillas"']]);
        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(csv.slice(1)).toBe('A;B\r\n1;x\r\n"y;z";"con ""comillas"""');
    });
    it('renders null/undefined as empty cells', () => {
        expect(toCsv(['A'], [[null], [undefined]]).slice(1)).toBe('A\r\n\r\n');
    });

    it('escapes a cell that looks like a formula so Excel treats it as text instead of evaluating it on open', () => {
        const csv = toCsv(['Producto'], [
            ['=SUM(A1:A2)'], ['+1+1'], ['-1+1'], ['@SUM(A1)'], ['Buldak Ramen'],
        ]);
        const lines = csv.slice(1).split('\r\n');
        expect(lines[1]).toBe("'=SUM(A1:A2)");
        expect(lines[2]).toBe("'+1+1");
        expect(lines[3]).toBe("'-1+1");
        expect(lines[4]).toBe("'@SUM(A1)");
        expect(lines[5]).toBe('Buldak Ramen'); // ordinary value passes through unchanged
    });
});

describe('business time (America/Bogota)', () => {
    it('buckets a 23:30 Bogotá sale in the same local day even though it is next day in UTC', () => {
        const d = new Date('2026-09-09T23:30:00-05:00'); // 04:30Z on the 10th
        expect(businessDayKey(d)).toBe('2026-09-09');
        expect(businessHour(d)).toBe(23);
        expect(startOfBusinessDay(d).toISOString()).toBe('2026-09-09T05:00:00.000Z');
        expect(endOfBusinessDay(d).toISOString()).toBe('2026-09-10T04:59:59.999Z');
    });
});
