import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';

const mockShiftFindUnique = vi.fn();
const mockRequireSession = vi.fn();
const mockRequireAdmin = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: { shift: { findUnique: (...a: any[]) => mockShiftFindUnique(...a) } },
}));
vi.mock('../../lib/auth', () => ({
    requireSession: (...a: any[]) => mockRequireSession(...a),
    requireAdmin: (...a: any[]) => mockRequireAdmin(...a),
}));

import { GET } from '../../app/api/export/[kind]/route';

function makeShift(overrides: Partial<Record<string, any>> = {}) {
    return {
        id: 'shift1',
        register: { name: 'Caja Principal', prefix: 'POS' },
        user: { name: 'Jhon' },
        userId: 'u1',
        startTime: new Date('2026-09-11T10:00:00-05:00'),
        endTime: new Date('2026-09-11T18:00:00-05:00'),
        baseAmount: 50000,
        closeAmount: 120000,
        sales: [],
        ...overrides,
    };
}

async function callShiftExport(id = 'shift1') {
    const req = new NextRequest(`http://localhost/api/export/shift?id=${id}`);
    return GET(req, { params: Promise.resolve({ kind: 'shift' }) });
}

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ id: 'u1', role: 'CASHIER' });
});

describe('GET /api/export/shift', () => {
    it('requires the id query param', async () => {
        const req = new NextRequest('http://localhost/api/export/shift');
        const res = await GET(req, { params: Promise.resolve({ kind: 'shift' }) });
        expect(res.status).toBe(400);
    });

    it('404s when the shift does not exist', async () => {
        mockShiftFindUnique.mockResolvedValue(null);
        const res = await callShiftExport();
        expect(res.status).toBe(404);
    });

    it('403s when the shift belongs to someone else and the caller is not ADMIN', async () => {
        mockShiftFindUnique.mockResolvedValue(makeShift({ userId: 'someone-else' }));
        const res = await callShiftExport();
        expect(res.status).toBe(403);
    });

    it('returns an .xlsx workbook with a Resumen sheet (cuadre) and a Ventas sheet (line detail)', async () => {
        mockShiftFindUnique.mockResolvedValue(makeShift({
            closeAmount: 60000, closeCard: 15000, closeTransfer: 26000, closeNote: 'Se dio un vuelto de más',
            sales: [{
                id: 'sale1', number: 10, createdAt: new Date('2026-09-11T12:00:00-05:00'), status: 'COMPLETED', total: 51000,
                details: [{ productCode: 'C1', productName: 'Buldak Ramen', quantity: 3, unitPrice: 20000, taxIvaAmount: 0, taxIcaAmount: 0, taxImpoConsumoAmount: 0, subtotal: 51000 }],
                payments: [
                    { method: 'CASH', amount: 10000, subAccountLabel: 'Persona 1' },
                    { method: 'CARD', amount: 15000, subAccountLabel: 'Persona 2' },
                    { method: 'TRANSFER', amount: 26000, subAccountLabel: 'Persona 3' },
                ],
            }],
        }));

        const res = await callShiftExport();
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('spreadsheetml');
        expect(res.headers.get('content-disposition')).toMatch(/\.xlsx"/);

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as any);
        expect(wb.worksheets.map((w) => w.name)).toEqual(['Resumen', 'Ventas']);

        // Cuadre: cash sales only (base excluded) = 10000 expected; counted 60000 → +50000 diff.
        const resumen = wb.getWorksheet('Resumen')!;
        expect(resumen.getRow(1).values).toEqual([undefined, 'Concepto', 'Esperado', 'Contado', 'Diferencia']);
        expect(resumen.getRow(2).values).toEqual([undefined, 'Efectivo (ventas, sin la base)', 10000, 60000, 50000]);
        expect(resumen.getRow(3).values).toEqual([undefined, 'Tarjeta / Datáfono', 15000, 15000, 0]);
        expect(resumen.getRow(4).values).toEqual([undefined, 'Transferencias', 26000, 26000, 0]);
        const text = JSON.stringify(resumen.getSheetValues());
        expect(text).toContain('Se dio un vuelto de más');

        // Ventas: per-method numeric columns and the split flag, no crammed text.
        const ventas = wb.getWorksheet('Ventas')!;
        const header = ventas.getRow(1).values as any[];
        expect(header.slice(13, 17)).toEqual(['Efectivo', 'Tarjeta', 'Transferencia', 'Cuenta dividida']);
        expect(ventas.getRow(2).values).toEqual(expect.arrayContaining([10000, 15000, 26000, 'Sí']));
        expect(text + JSON.stringify(ventas.getSheetValues())).not.toMatch(/\|/);
    });

    it('marks a normal (non-split) sale as not split and shows blank counts for shifts closed before the breakdown existed', async () => {
        mockShiftFindUnique.mockResolvedValue(makeShift({
            closeAmount: 52000, // legacy: only the cash count was stored
            sales: [{
                id: 'sale2', number: 11, createdAt: new Date('2026-09-11T13:00:00-05:00'), status: 'COMPLETED', total: 2000,
                details: [{ productCode: 'C2', productName: 'Agua', quantity: 1, unitPrice: 2000, taxIvaAmount: 0, taxIcaAmount: 0, taxImpoConsumoAmount: 0, subtotal: 2000 }],
                payments: [{ method: 'CASH', amount: 2000 }],
            }],
        }));

        const res = await callShiftExport();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as any);
        expect(wb.getWorksheet('Ventas')!.getRow(2).values).toEqual(expect.arrayContaining([2000, 0, 0, 'No']));
        const resumen = wb.getWorksheet('Resumen')!;
        expect(resumen.getRow(2).getCell(3).value).toBe(52000);
        expect(resumen.getRow(3).getCell(3).value === null || resumen.getRow(3).getCell(3).value === '').toBe(true);
    });
});
